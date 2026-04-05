# NeonLink Backend-Schema (Startpunkt)

## Kernideen
- Ein `Workspace` enthaelt Rubriken (`Section`) und Raeume (`Room`).
- Nachrichten sind immer einem Raum zugeordnet.
- Einladungen laufen ueber Token/Code.
- Kalender-Events sind im Workspace und optional in einem Raum sichtbar.

## Relationales Modell (SQL-nah)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL, -- owner/admin/member/guest
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE sections (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  key TEXT NOT NULL, -- familie/freunde/verwandte/...
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  section_id UUID NOT NULL REFERENCES sections(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- text/voice/meeting
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  sender_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP
);

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT NOT NULL
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  room_id UUID REFERENCES rooms(id),
  title TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  location TEXT
);

CREATE TABLE invites (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  invited_by UUID NOT NULL REFERENCES users(id),
  invite_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0
);
```

## API-Schnitte (MVP)
- `POST /auth/login`
- `GET /workspaces/:id`
- `GET /workspaces/:id/rooms`
- `GET /rooms/:id/messages?cursor=...`
- `POST /rooms/:id/messages`
- `POST /workspaces/:id/invites`
- `GET /workspaces/:id/events`

## Echtzeit
- WebSocket Channel pro `room_id` fuer neue Messages.
- Presence (`online`, `away`, `busy`) ueber Heartbeat alle 20-30 Sekunden.
