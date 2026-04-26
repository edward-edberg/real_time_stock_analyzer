import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { formatFeedItem, formatLoading, formatError, initPage, updatePage } from './glasses-ui';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const preview = document.getElementById('preview');
let bridge = null;
let lastContent = formatLoading();
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
async function tick() {
    try {
        const item = await fetchFeed();
        console.log('feed:', item.tweet_id, item.analysis.summary);
        lastContent = formatFeedItem(item);
    }
    catch (err) {
        console.error('feed fetch failed:', err);
        lastContent = formatError(String(err));
    }
    showPreview(lastContent);
    await sendToGlasses(lastContent);
}
// Bridge connects whenever the simulator injects it — no timeout.
// Once ready, init with whatever is currently showing.
async function connectBridge() {
    bridge = await waitForEvenAppBridge();
    console.log('EvenAppBridge connected');
    const initResult = await initPage(bridge, lastContent);
    if (initResult !== 0)
        console.error('initPage failed with code', initResult);
}
async function main() {
    showPreview(lastContent);
    connectBridge(); // runs in background, no await
    document.getElementById('analyze-btn')?.addEventListener('click', tick);
}
main().catch((err) => console.error('fatal:', err));
