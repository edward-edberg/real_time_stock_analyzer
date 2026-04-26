"""
Backend proxy for the Even G2 tweet-stock-impact analyzer.

Why this exists:
  - Glasses run a WebView that enforces CORS strictly.
  - Anthropic API doesn't support direct browser calls (and we'd leak the API key).
  - Tweet sources (X/Truth Social) don't allow browser CORS either.
  - So this server: holds the API key, calls Claude, returns CORS-friendly JSON.

To swap mock data for real data later: replace get_next_tweet() with whatever
fetches from your actual tweet source. The /feed contract stays the same.
"""

import json
import os
from itertools import cycle
from typing import Iterator

import anthropic
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from mock_tweets import MOCK_TWEETS

app = FastAPI(title="Tweet → Stock Impact (Even G2 backend)")

# Wide-open CORS for dev. In production, replace with your glasses app's origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── tweet rotation ──────────────────────────────────────────────────────────
# In real life this would be a poll loop / webhook. For the demo we just
# advance through the mock list one tweet per /feed call.
_tweet_iter: Iterator[dict] = cycle(MOCK_TWEETS)


def get_next_tweet() -> dict:
    return next(_tweet_iter)


# ─── Claude client ───────────────────────────────────────────────────────────
_client: anthropic.Anthropic | None = None


def claude() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY env var not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


ANALYSIS_PROMPT = """You are a financial analyst. Given a political tweet, identify which publicly-traded stocks are likely to be impacted, the direction (UP/DOWN), and a one-line reason.

Output ONLY valid JSON, no preamble, no code fences. Schema:
{
  "summary": "5-10 word summary of the tweet's market-relevant claim",
  "impacts": [
    {"ticker": "TICKER", "direction": "UP" | "DOWN", "confidence": "HIGH" | "MED" | "LOW", "reason": "≤60 char reason"}
  ]
}

Limit to the top 3 most-impacted tickers. Keep reasons under 60 characters — these display on tiny smart-glasses screens.

Tweet:
"""


class Impact(BaseModel):
    ticker: str
    direction: str
    confidence: str
    reason: str


class Analysis(BaseModel):
    summary: str
    impacts: list[Impact]


class FeedItem(BaseModel):
    tweet_id: str
    author: str
    timestamp: str
    tweet_text: str
    analysis: Analysis


def analyze_tweet(tweet_text: str) -> Analysis:
    """Send tweet to Claude, parse JSON response into Analysis."""
    msg = claude().messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": ANALYSIS_PROMPT + tweet_text}],
    )
    # Response is a list of content blocks; we want the text from the first one.
    raw = "".join(block.text for block in msg.content if block.type == "text").strip()
    # Strip code fences defensively in case the model adds them.
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Claude returned invalid JSON: {raw[:200]}") from e
    return Analysis(**data)


# ─── routes ──────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/feed", response_model=FeedItem)
def feed():
    """One-shot endpoint the glasses poll. Returns next tweet + its analysis."""
    tweet = get_next_tweet()
    analysis = analyze_tweet(tweet["text"])
    return FeedItem(
        tweet_id=tweet["id"],
        author=tweet["author"],
        timestamp=tweet["timestamp"],
        tweet_text=tweet["text"],
        analysis=analysis,
    )


# Useful for debugging without burning API calls
@app.get("/feed/mock", response_model=FeedItem)
def feed_mock():
    """Same shape as /feed but with a hardcoded analysis. No Claude call."""
    tweet = get_next_tweet()
    return FeedItem(
        tweet_id=tweet["id"],
        author=tweet["author"],
        timestamp=tweet["timestamp"],
        tweet_text=tweet["text"],
        analysis=Analysis(
            summary="Mock analysis (no LLM call)",
            impacts=[
                Impact(ticker="NVDA", direction="UP", confidence="HIGH", reason="Tariffs on competitors benefit US chip makers"),
                Impact(ticker="INTC", direction="UP", confidence="MED", reason="Mentioned by name as winner"),
                Impact(ticker="TSM", direction="DOWN", confidence="MED", reason="Taiwan exposure to China tariffs"),
            ],
        ),
    )
