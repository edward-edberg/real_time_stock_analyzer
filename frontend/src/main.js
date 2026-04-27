import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { formatFeedItem, formatFeedItemSimple, formatLoading, formatError, initPage, updatePage } from './glasses-ui';
import { renderCharts } from './browser-ui';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const preview = document.getElementById('preview');
const tweetAuthor = document.getElementById('tweet-author');
const tweetTime = document.getElementById('tweet-time');
const tweetText = document.getElementById('tweet-text');
const summaryText = document.getElementById('summary-text');
const impactsEl = document.getElementById('impacts');
const statusDot = document.getElementById('status-dot');
let bridge = null;
let lastContent = formatLoading();
let simpleMode = false;
let lastItem = null;
function setStatus(state) {
    if (!statusDot)
        return;
    statusDot.className = 'w-2.5 h-2.5 rounded-full ' + {
        idle: 'bg-gray-600',
        loading: 'bg-yellow-400 animate-pulse',
        ok: 'bg-emerald-400',
        error: 'bg-red-500',
    }[state];
}
function renderDashboard(item) {
    if (tweetAuthor)
        tweetAuthor.textContent = item.author;
    if (tweetTime) {
        const m = item.timestamp.match(/T(\d{2}:\d{2})/);
        tweetTime.textContent = m ? m[1] : '';
    }
    if (tweetText)
        tweetText.textContent = item.tweet_text;
    if (summaryText)
        summaryText.textContent = item.analysis.summary;
    if (impactsEl) {
        impactsEl.innerHTML = item.analysis.impacts.map((impact) => {
            const isUp = impact.direction === 'UP';
            const arrow = isUp ? '▲' : '▼';
            const color = isUp ? 'text-emerald-400' : 'text-red-400';
            const bg = isUp ? 'bg-emerald-950 border-emerald-800' : 'bg-red-950 border-red-900';
            const confColor = { HIGH: 'text-white', MED: 'text-gray-300', LOW: 'text-gray-500' }[impact.confidence] ?? 'text-gray-400';
            return `
        <div class="flex items-center gap-3 rounded-xl px-4 py-3 border ${bg}">
          <span class="text-xl font-bold ${color}">${arrow}</span>
          <span class="text-base font-bold w-14">${impact.ticker}</span>
          <div class="flex flex-col flex-1 min-w-0">
            <span class="text-xs ${confColor} font-semibold">${impact.confidence}</span>
            <span class="text-xs text-gray-400 truncate">${impact.reason}</span>
          </div>
        </div>
      `;
        }).join('');
    }
}
function showPreview(text) {
    if (preview)
        preview.textContent = text;
}
async function sendToGlasses(content) {
    if (!bridge)
        return;
    await updatePage(bridge, content);
}
async function fetchFeed() {
    const res = await fetch(`${BACKEND_URL}/feed`);
    if (!res.ok)
        throw new Error(`Backend returned ${res.status}: ${await res.text()}`);
    return res.json();
}
function buildGlassesContent(item) {
    return simpleMode ? formatFeedItemSimple(item) : formatFeedItem(item);
}
function updateModeButton() {
    const btn = document.getElementById('mode-btn');
    if (!btn)
        return;
    if (simpleMode) {
        btn.textContent = 'SIMPLE MODE';
        btn.className = btn.className.replace('bg-gray-700 hover:bg-gray-600 text-gray-200', 'bg-emerald-700 hover:bg-emerald-600 text-white');
    }
    else {
        btn.textContent = 'REGULAR MODE';
        btn.className = btn.className.replace('bg-emerald-700 hover:bg-emerald-600 text-white', 'bg-gray-700 hover:bg-gray-600 text-gray-200');
    }
}
async function tick() {
    setStatus('loading');
    try {
        const item = await fetchFeed();
        console.log('feed:', item.tweet_id, item.analysis.summary);
        lastItem = item;
        renderDashboard(item);
        renderCharts(item.analysis.impacts);
        lastContent = buildGlassesContent(item);
        setStatus('ok');
    }
    catch (err) {
        console.error('feed fetch failed:', err);
        lastContent = formatError(String(err));
        setStatus('error');
    }
    showPreview(lastContent);
    await sendToGlasses(lastContent);
}
async function connectBridge() {
    bridge = await waitForEvenAppBridge();
    console.log('EvenAppBridge connected');
    const initResult = await initPage(bridge, lastContent);
    if (initResult !== 0)
        console.error('initPage failed with code', initResult);
}
async function main() {
    showPreview(lastContent);
    connectBridge();
    document.getElementById('analyze-btn')?.addEventListener('click', tick);
    document.getElementById('mode-btn')?.addEventListener('click', async () => {
        simpleMode = !simpleMode;
        updateModeButton();
        // immediately push updated format to glasses if we have data
        if (lastItem) {
            lastContent = buildGlassesContent(lastItem);
            showPreview(lastContent);
            await sendToGlasses(lastContent);
        }
    });
    tick();
}
main().catch((err) => console.error('fatal:', err));
