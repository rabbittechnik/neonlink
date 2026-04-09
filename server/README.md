# NeonLink Server (MVP)

## Start

```bash
npm install
npm run dev
```

Server laeuft standardmaessig auf `http://localhost:4000`.

## REST Endpunkte

- `GET /health`
- **Transit (HAFAS-Proxy, oeffentlich):**
  - `GET /transit/info` — Strategie & Hinweise (GTFS-RT-Hook serverseitig vorbereitet)
  - `GET /transit/locations/nearby?latitude=&longitude=&results=&mode=auto|bvg|db` — Fallback zwischen BVG/DB
  - `GET /transit/locations?query=&results=&provider=bvg|db` — Haltestellensuche mit Fallback
  - `GET /transit/stops/:stopId/departures?provider=bvg|db&limit=` — Abfahrten (Retry upstream)
- `POST /auth/login` body: `{ "email": "bianca@example.com" }`
- `GET /workspaces/ws-neonlink`
- `GET /workspaces/ws-neonlink/rooms`
- `GET /workspaces/ws-neonlink/events`
- `GET /rooms/room-fam-allg/messages`
- `POST /rooms/room-fam-allg/messages` body: `{ "senderUserId": "u1", "body": "Hallo" }`

## Socket Events

Client -> Server:
- `room:join` (roomId)
- `room:leave` (roomId)
- `chat:sendMessage` ({ roomId, senderUserId, body, replyToId?, attachments? })
- `chat:typing` ({ roomId, userId, displayName, isTyping })

Server -> Client:
- `chat:messageCreated` (Message)
- `chat:typing` (same payload; an andere Clients im Raum)

## Anhaenge

- Nachricht optional mit `attachments: [{ fileName, mimeType, sizeBytes }]`
- Download: `GET /attachments/:id/download` (Mock-Datei)
