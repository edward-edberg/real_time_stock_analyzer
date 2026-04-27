import type { Impact } from './types'

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY

interface Quote {
  c: number  // current price
  d: number  // change
  dp: number // percent change
}

async function fetchQuote(ticker: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function addTradingViewWidget(container: HTMLElement, ticker: string, impact: Impact) {
  const widgetDiv = document.createElement('div')
  widgetDiv.className = 'tradingview-widget-container__widget'
  container.appendChild(widgetDiv)

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.async = true
  script.textContent = JSON.stringify({
    symbol: ticker,
    width: '100%',
    height: 180,
    locale: 'en',
    dateRange: '1D',
    colorTheme: 'dark',
    trendLineColor:
      impact.direction === 'UP' ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)',
    underLineColor:
      impact.direction === 'UP' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    underLineBottomColor: 'rgba(0,0,0,0)',
    isTransparent: true,
    autosize: false,
  })
  script.src =
    'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
  container.appendChild(script)
}

export async function renderCharts(impacts: Impact[]): Promise<void> {
  const chartsEl = document.getElementById('charts')
  if (!chartsEl) return

  chartsEl.innerHTML = ''

  const highImpacts = impacts.filter((i) => i.confidence === 'HIGH')
  if (highImpacts.length === 0) {
    chartsEl.innerHTML =
      '<p style="color:#555;font-style:italic;margin-top:16px">No HIGH confidence signals this tweet.</p>'
    return
  }

  const quotes = await Promise.all(highImpacts.map((i) => fetchQuote(i.ticker)))

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;margin-top:16px'
  chartsEl.appendChild(row)

  highImpacts.forEach((impact, idx) => {
    const quote = quotes[idx]
    const isUp = impact.direction === 'UP'
    const arrowColor = isUp ? '#22c55e' : '#ef4444'
    const priceColor = quote && quote.dp >= 0 ? '#22c55e' : '#ef4444'

    const card = document.createElement('div')
    card.style.cssText =
      'background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;padding:14px;min-width:280px;flex:1'

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px'
    header.innerHTML = `
      <span style="font-size:20px;font-weight:bold;color:#fff">${impact.ticker}</span>
      <span style="color:${arrowColor};font-size:18px">${isUp ? '▲' : '▼'}</span>
      <span style="background:#2a2a3a;color:#888;padding:2px 8px;border-radius:4px;font-size:11px;letter-spacing:0.05em">HIGH</span>
      ${
        quote && quote.c != null
          ? `<span style="color:${priceColor};font-size:13px;margin-left:auto;font-weight:600">
               $${quote.c.toFixed(2)}
               <span style="opacity:0.8">${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}%</span>
             </span>`
          : ''
      }
    `

    const reason = document.createElement('div')
    reason.style.cssText = 'color:#666;font-size:12px;margin-bottom:10px;line-height:1.4'
    reason.textContent = impact.reason

    const tvContainer = document.createElement('div')
    tvContainer.className = 'tradingview-widget-container'
    addTradingViewWidget(tvContainer, impact.ticker, impact)

    const buyBtn = document.createElement('a')
    buyBtn.href = `https://client.schwab.com/app/trade/tom/trade?ACTION=Buy&SYMBOL=${impact.ticker}`
    buyBtn.target = '_blank'
    buyBtn.rel = 'noopener noreferrer'
    buyBtn.style.cssText = [
      'display:flex;align-items:center;justify-content:center;gap:8px',
      'margin-top:12px;padding:10px',
      'background:#22c55e;color:#000;font-weight:bold;font-size:13px;letter-spacing:0.08em',
      'border-radius:8px;text-decoration:none',
      'transition:background 0.15s',
    ].join(';')
    buyBtn.textContent = `BUY ${impact.ticker} ON SCHWAB`
    buyBtn.onmouseover = () => { buyBtn.style.background = '#16a34a' }
    buyBtn.onmouseout  = () => { buyBtn.style.background = '#22c55e' }

    card.appendChild(header)
    card.appendChild(reason)
    card.appendChild(tvContainer)
    card.appendChild(buyBtn)
    row.appendChild(card)
  })
}
