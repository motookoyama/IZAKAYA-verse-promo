# IZAKAYA BFF

Mini BFF service for IZAKAYA verse. Provides wallet ledger management, PayPal IPN integration, persona routing, and admin utilities.

## Requirements

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
cp .env.example .env # update values as needed
npm run dev
```

The service listens on the port defined in `.env` (default `4117`).

## Scripts

| command            | description                      |
|--------------------|----------------------------------|
| `npm run dev`      | run the API locally              |
| `npm run start`    | production start (same as dev)   |
| `npm run build`    | placeholder for future bundling  |

## PayPal IPN

1. Configure PayPal IPN to call `/paypal/ipn/notify` of the deployed BFF.
2. Confirm logs in `logs/ipn.log` (created automatically).
3. Wallet data is stored in `data/wallet.json`.

## Deployment

1. Ensure environment variables in `.env` are set in your deployment target.
2. Docker example:
   ```Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   ENV PORT=8080
   EXPOSE 8080
   CMD ["npm", "start"]
   ```
3. For Cloud Run / Cloudflare Workers, adapt scripts in `scripts/` (add as needed).

## Testing checklist before push

- `npm install` completes without errors
- `npm run dev` responds with `GET /health/ping`
- Wallet diagnostic endpoint `/admin/wallet/diagnostic` returns OK (requires admin header)
- No sensitive secrets committed (`.env` is ignored)
