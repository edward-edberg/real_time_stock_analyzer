# Tweet Stock Impact — Even G2 Hackathon Project

Live analysis of political tweets and their projected stock-market impact, displayed on Even Realities G2 smart glasses.

```
┌─────────────┐  /feed  ┌──────────────┐  bridge  ┌─────────┐
│ Mock tweets │ ◄────── │ FastAPI +    │ ───────► │ G2      │
│  (rotating) │         │ Claude API   │          │ glasses │
└─────────────┘         └──────────────┘          └─────────┘
```

## Quick start (simulator, no glasses needed)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --reload --port 8000
```

Sanity check:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/feed/mock   # no API call, free
curl http://localhost:8000/feed        # real Claude call
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### 3. Simulator

In a third terminal:

```bash
evenhub-simulator http://localhost:5173
```

You should see the glasses display rotate through tweets every ~12 seconds, each annotated with 3 ticker impacts.

## Running on real hardware

1. Make sure your phone and laptop are on the same Wi-Fi.
2. Find your laptop's LAN IP (`ipconfig getifaddr en0` on macOS).
3. Generate a sideload QR:
   ```bash
   evenhub qr --url "http://<your-lan-ip>:5173"
   ```
4. Scan with the Even Realities app. The plugin loads with hot reload.

For the hardware path you also need the backend reachable from the phone — the simplest demo move is to run the backend on the same laptop and update `VITE_BACKEND_URL`:

```bash
VITE_BACKEND_URL=http://<your-lan-ip>:8000 npm run dev
```

## Going to production

Two things change:

1. **Host the backend somewhere with HTTPS** (Fly.io, Render, App Runner — you've used App Runner before). Plain http won't work; the WebView blocks mixed content.
2. **Update `frontend/app.json`** — replace the `whitelist` placeholder with your real backend origin. Then pack:
   ```bash
   cd frontend && npm run build
   evenhub pack app.json dist -o tweet-glasses.ehpk
   ```
   Upload the `.ehpk` to the dev portal.

The backend's `CORSMiddleware` is currently `allow_origins=["*"]` for dev — fine for hackathon, lock it down to the WebView origin for prod.

## Swapping mock tweets for real ones

Replace `get_next_tweet()` in `backend/main.py`. Possible sources:

- **Truth Social** — Trump's primary platform. Unofficial scrapers exist; rate-limit yourself.
- **X/Twitter API** — paid tiers only; basic is ~$200/mo.
- **Polling an RSS bridge** — e.g. nitter-style mirrors, sometimes flaky.

The `/feed` response contract stays the same — the frontend doesn't care where the tweets come from.

## File map

```
backend/
  main.py              FastAPI: /health, /feed, /feed/mock
  mock_tweets.py       6 hand-picked tweets across sectors
  requirements.txt
frontend/
  src/
    main.ts            Polls /feed, paints glasses
    glasses-ui.ts      Display formatting + SDK calls
    types.ts           Shared with backend response shape
  app.json             Even Hub manifest (network whitelist!)
  index.html
  vite.config.ts       host:true for QR sideload
```
