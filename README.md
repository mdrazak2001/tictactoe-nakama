# TikTok to Nakama

A lightweight bridge service that receives TikTok webhook events and forwards or translates them into actions on a Nakama game server. Use it to sync TikTok-driven events (uploads, comments, likes, creator actions) into Nakama for in-game rewards, analytics, or social features.

Features
- Receives and validates TikTok webhook callbacks.
- Transforms TikTok payloads into a Nakama-friendly RPC/storage call.
- Configurable mapping and authentication for Nakama endpoints.
- Run locally (Node.js) or in Docker.

Table of contents
- Summary / Purpose
- Prerequisites
- Installation
- Configuration
- Running the service
- Usage Examples
- Testing
- Troubleshooting
- License & Maintainer

Summary / Purpose
This project exposes an HTTP endpoint that TikTok can call (webhook). It validates the callback, optionally verifies the request signature, normalizes the event payload, and forwards it to a Nakama server (typically via an RPC or storage write). The bridge is intentionally minimal and configurable so you can adapt it to your Nakama schema or workflows.

Prerequisites
- Node.js 16+ (or compatible LTS)
- npm or yarn
- A running Nakama server reachable from the bridge (local or remote)
- A TikTok developer application with webhook permissions (app credentials / webhook secret)
- Optional: Docker & docker-compose for local testing

Installation

Clone the repo and install dependencies:

```
git clone https://github.com/your-org/tiktok-to-nakama.git
cd tiktok-to-nakama
npm install
```

Or using yarn:

```
yarn install
```

Configuration
The bridge uses environment variables to control TikTok and Nakama credentials and endpoints. Create a `.env` file in the project root (example below) or set environment variables in your deployment environment.

Required environment variables

- TIKTOK_CLIENT_KEY - Your TikTok app client key (or app id)
- TIKTOK_CLIENT_SECRET - Your TikTok app client secret
- TIKTOK_WEBHOOK_SECRET - Webhook verification secret (optional but recommended)
- NAKAMA_URL - Full URL to Nakama HTTP endpoint (e.g., https://nakama.local:7351)
- NAKAMA_SERVER_KEY - Nakama server key used for RPC/admin calls
- APP_PORT - Port for the bridge to listen on (default 3000)

Example .env

```
# TikTok
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_WEBHOOK_SECRET=your_webhook_secret

# Nakama
NAKAMA_URL=https://nakama.local:7351
NAKAMA_SERVER_KEY=default_server_key

# App
APP_PORT=3000
LOG_LEVEL=info
```

Alternative JSON configuration
If you prefer JSON config, you can provide config.json (the app will accept it if enabled in code):

config.json
```
{
  "tiktok": {
    "clientKey": "your_tiktok_client_key",
    "clientSecret": "your_tiktok_client_secret",
    "webhookSecret": "your_webhook_secret"
  },
  "nakama": {
    "url": "https://nakama.local:7351",
    "serverKey": "default_server_key"
  },
  "app": {
    "port": 3000,
    "logLevel": "info"
  }
}
```

How authentication to Nakama is performed
The bridge will post normalized events to a Nakama RPC endpoint (by default `/v2/rpc/tiktok_event`). The example code uses HTTP Basic auth with an empty username and the Nakama server key as the password (i.e., `Authorization: Basic base64(:<server_key>)`). Adjust the auth strategy if your Nakama deployment expects a different method (JWT, custom header, etc.).

Running the service

Start in development mode:

```
npm run dev
```

Start in production mode:

```
npm start
```

Docker (example)
A minimal docker-compose snippet that runs the bridge and links to a Nakama container:

docker-compose.yml (example)
```
version: '3.8'
services:
  nakama:
    image: heroiclabs/nakama:3.0.0
    environment:
      - "socket.ssl=false"
      - "database.address=postgres:5432"
      - "nakama.logger.level=debug"
      - "nakama.logger.stdout=true"
    ports:
      - "7350:7350"
      - "7351:7351"

  tiktok-bridge:
    build: .
    environment:
      - TIKTOK_CLIENT_KEY=${TIKTOK_CLIENT_KEY}
      - TIKTOK_CLIENT_SECRET=${TIKTOK_CLIENT_SECRET}
      - TIKTOK_WEBHOOK_SECRET=${TIKTOK_WEBHOOK_SECRET}
      - NAKAMA_URL=http://nakama:7351
      - NAKAMA_SERVER_KEY=${NAKAMA_SERVER_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - nakama
```

Usage Examples / Commands

Basic health check (after starting):
```
curl http://localhost:3000/health
```

Simulate a TikTok webhook POST (unsigned)
```
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "video.uploaded",
    "user_id": "12345",
    "video_id": "abcde",
    "created_at": "2026-04-28T12:00:00Z"
  }'
```

Simulate a signed webhook
If TIKTOK_WEBHOOK_SECRET is set, compute an HMAC SHA256 of the body and set it in `X-Tiktok-Signature`. Example Node.js to generate header:

```js
const crypto = require('crypto');
const body = JSON.stringify(payload);
const sig = crypto.createHmac('sha256', process.env.TIKTOK_WEBHOOK_SECRET).update(body).digest('hex');
// set header: 'X-Tiktok-Signature': sig
```

Forwarded request to Nakama (example snippet inside bridge)
```js
const axios = require('axios');

async function forwardToNakama(payload) {
  const nakamaUrl = process.env.NAKAMA_URL + '/v2/rpc/tiktok_event';
  const auth = Buffer.from(':' + process.env.NAKAMA_SERVER_KEY).toString('base64');
  await axios.post(nakamaUrl, payload, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });
}
```

Testing

Unit tests
- Run unit tests with:
  ```
  npm test
  ```
- Tests cover payload parsing, signature verification, and mapping logic. Mocks are used for Nakama HTTP calls.

Integration tests
- Use docker-compose to run a local Nakama instance, then execute integration scripts:
  ```
  docker-compose up -d
  npm run test:integration
  ```
- Integration tests deliver sample TikTok events and assert that Nakama RPCs / storage writes succeed.

Troubleshooting

- 401 Unauthorized when sending to Nakama
  - Verify NAKAMA_SERVER_KEY is correct.
  - Check the auth schema your Nakama expects (some setups use JWT or other headers).
  - Try calling the Nakama `/v2/rpc` endpoint manually with the same auth headers used by the bridge.

- Webhook signature verification fails
  - Ensure TIKTOK_WEBHOOK_SECRET matches the secret configured in TikTok Developer Console.
  - Verify you compute HMAC using the raw request body (exact bytes), not a pretty-printed JSON string.
  - Confirm the header name matches your TikTok setup (this project uses X-Tiktok-Signature by default).

- Request times out / Nakama not reachable
  - Check NAKAMA_URL and that the host/port are reachable from the bridge.
  - In Docker, ensure both services are on the same network and use service names (e.g., `http://nakama:7351`).

- Local development: port conflicts
  - Change APP_PORT in .env or stop the conflicting service.

- Logs are empty or not helpful
  - Set LOG_LEVEL=debug in .env for more verbose logging.

Extending / Customizing
- Update mapping logic in src/transformers to map TikTok events into your Nakama RPC payloads.
- Replace the forwarding function to call Nakama storage, matchmaker, or custom RPC functions as needed.
- Add authentication to the bridge (IP allow-list, basic auth) if exposing it publicly.

License
MIT License — see LICENSE file for details.

Maintainer / Contact
- Maintainer: Your Name (your.name@example.com)
- Repo: https://github.com/your-org/tiktok-to-nakama
- For issues and feature requests, please open a GitHub issue on the repository.

Acknowledgements
- Built to integrate TikTok webhook events with Nakama. Adapt and contribute back via pull requests.