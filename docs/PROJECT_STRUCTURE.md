# NeonLink Projektstruktur (MVP)

## Ziel
Diese Struktur trennt UI, Fachlogik und Datenquellen, damit die App von Mockup zu echter Collaboration-Plattform wachsen kann.

## Empfohlene Ordner

```text
src/
  app/                  # Routing, globale Provider, Theme, Guards
  components/           # Wiederverwendbare UI-Bausteine
  features/
    auth/               # Login, Session, Invite-Flow
    workspaces/         # Rubriken, Raeume, Sidebar
    chat/               # Nachrichten, Attachments, Reactions
    calls/              # Voice/Video/Meetings
    calendar/           # Termine, Erinnerungen
    contacts/           # Kontakte, Praesenzstatus
    ideas/              # Gemeinsame Ideentafeln / Aufgaben
  data/
    mockWorkspace.ts    # Lokale Seed-Daten fuer MVP
  services/
    api/                # HTTP/GraphQL Clients
    realtime/           # WebSocket/RTC Signaling
    storage/            # localStorage, Cache
  types/
    collab.ts           # Domänen-Typen
  pages/                # Page-Level Komponenten
  styles/               # Theme Tokens, Animation Presets
```

## MVP Reihenfolge

1. `workspaces` + `chat` + `contacts` + `calendar`
2. `calls` (Voice zuerst, dann Video)
3. `ideas` (Board + Aufgaben + Einladungen)
4. Sound/Animation als polierender Layer
