# moyu-fortune-deploy

- `main` → Render Free **moyu-light** API (`dist/light.js`) · https://moyu-fortune.onrender.com
- `gh-pages` → static frontend · https://chillworks.ai (VITE_MOYU_API_BASE → onrender)

Source: `~/moyu-fortune` private. Path B = light REST (no MySQL/Stripe/OAuth).

# moyu-fortune-deploy

| Branch | Role |
|--------|------|
| `gh-pages` | Production frontend https://chillworks.ai |
| `main` | Render Free **light API** https://moyu-fortune.onrender.com |

## Frontend rebuild

```bash
cd ~/moyu-fortune
VITE_STATIC_MODE=true VITE_MOYU_API_BASE=https://moyu-fortune.onrender.com pnpm exec vite build
bash ~/quantradar/scripts/rebuild_static.sh moyu   # or sync gh-pages manually
```

## API

- `GET /health`
- `POST /api/light/draw`
- `GET /api/light/history?deviceId=`
- `GET /api/light/leaderboard`

See `moyu-fortune/docs/MOYU_BACKEND_B.md`.
