# Mini BFF (apps/bff/mini)

Express で実装された軽量 BFF。Persona Engine との連携を担当します。

## ローカル起動
```bash
cd apps/bff/mini
npm install
PERSONA_ENGINE_URL=http://localhost:4105 npm run dev
```

## API
- `GET /api/health`
- `GET /api/points`
- `GET /api/personas`
- `GET /api/personas/:id`
- `GET /api/emotion`

Docker Compose を利用する場合は `apps/docker-compose.yml` の `mini-bff` サービス名で起動できます。
