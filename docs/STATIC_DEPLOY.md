# MoYu static deploy (Path A)

1. Build from private SSOT:
   ```bash
   cd ~/moyu-fortune
   VITE_STATIC_MODE=true pnpm exec vite build
   # → dist/public
   ```
2. Sync to this repo `dist/public` and **always include** root `CNAME` with:
   ```
   chillworks.ai
   ```
3. Push `gh-pages` branch as the static root (not a subfolder). Missing CNAME drops custom domain.
4. Verify:
   ```bash
   curl -sS https://chillworks.ai/version.json
   # no undefined/app-auth in main JS
   python3 ~/quantradar/scripts/sites_extreme_verify.py
   ```
