// Mirrors backend FeedItem in main.py — keep in sync.

export interface Impact {
  ticker: string
  direction: 'UP' | 'DOWN'
  confidence: 'HIGH' | 'MED' | 'LOW'
  reason: string
}

export interface Analysis {
  summary: string
  impacts: Impact[]
}

export interface FeedItem {
  tweet_id: string
  author: string
  timestamp: string
  tweet_text: string
  analysis: Analysis
}
