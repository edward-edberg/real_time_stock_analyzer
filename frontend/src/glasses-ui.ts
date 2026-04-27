/**
 * Render helpers for the Even G2 display.
 *
 * Display constraints (from docs/guides/display):
 *   - 576x288 px, 4-bit greyscale
 *   - One full-screen text container holds ~400-500 chars before overflow
 *   - No font sizes, weights, alignment — just plain text + newlines
 *   - Useful unicode chars for arrows: ▲ ▼ ↻
 *
 * Strategy: build one string that fits ~400 chars. Use textContainerUpgrade
 * for refreshes (flicker-free per docs) instead of rebuilding the page.
 */

import {
  EvenAppBridge,
  TextContainerProperty,
  TextContainerUpgrade,
  CreateStartUpPageContainer,
} from '@evenrealities/even_hub_sdk'
import type { FeedItem, Impact } from './types'

const SCREEN_WIDTH = 576
const SCREEN_HEIGHT = 288
const MAIN_CONTAINER_ID = 1
const MAIN_CONTAINER_NAME = 'main'
// Conservative budget — display guide says ~400-500 chars fills the screen.
const MAX_CHARS = 420

// ─── formatting ──────────────────────────────────────────────────────────────

function arrow(direction: Impact['direction']): string {
  return direction === 'UP' ? '▲' : '▼'
}

function shortTime(iso: string): string {
  // "2026-04-26T09:14:00Z" → "09:14"
  const m = iso.match(/T(\d{2}:\d{2})/)
  return m ? m[1] : ''
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

/**
 * Pack a FeedItem into a string under MAX_CHARS, preserving as much of the
 * tweet text as possible while always showing all impacts.
 */
export function formatFeedItem(item: FeedItem): string {
  const header = `${item.author}  ${shortTime(item.timestamp)}`

  // Each impact row: e.g. "▲ NVDA  HIGH  Tariffs benefit US chip makers"
  const impactLines = item.analysis.impacts.map(
    (i) => `${arrow(i.direction)} ${i.ticker.padEnd(5)} ${i.confidence.padEnd(4)} ${i.reason}`,
  )

  const separator = '──────────────────────────'
  const fixed = [header, '', '', separator, ...impactLines].join('\n')
  const tweetBudget = MAX_CHARS - fixed.length
  const tweetText = truncate(item.tweet_text, Math.max(60, tweetBudget))

  return [header, '', tweetText, separator, ...impactLines].join('\n')
}

/**
 * Simple mode: author + ticker/direction only — no tweet text, no confidence, no reason.
 * e.g.
 *   @realDonaldTrump
 *   ▲ NVDA  ▲ INTC  ▼ TSM
 */
export function formatFeedItemSimple(item: FeedItem): string {
  const tickerLine = item.analysis.impacts
    .map((i) => `${arrow(i.direction)} ${i.ticker}`)
    .join('  ')
  return `${item.author}\n${tickerLine}`
}

export function formatLoading(): string {
  return ['TWEET ↻ live', '', 'Waiting for next tweet…'].join('\n')
}

export function formatError(msg: string): string {
  return ['TWEET ⚠ error', '', truncate(msg, 300)].join('\n')
}

// ─── glasses I/O ─────────────────────────────────────────────────────────────

/**
 * Build the initial full-screen text page. Call once at startup.
 */
export async function initPage(bridge: EvenAppBridge, content: string): Promise<number> {
  const main = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 6,
    containerID: MAIN_CONTAINER_ID,
    containerName: MAIN_CONTAINER_NAME,
    content,
    isEventCapture: 1, // exactly one container needs this; ours is the only one
  })

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [main],
    }),
  )
  // 0 = success; non-zero values are in docs/getting-started/first-app
  return result
}

/**
 * Update content in place — flicker-free vs. rebuilding the whole page.
 */
export async function updatePage(bridge: EvenAppBridge, content: string): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: MAIN_CONTAINER_ID,
      containerName: MAIN_CONTAINER_NAME,
      content,
      contentOffset: 0,
      contentLength: content.length,
    }),
  )
}
