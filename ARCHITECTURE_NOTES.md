# Architecture Notes - pbjs_engine (prebidjs-light)

**Created:** January 28, 2026

## ⚠️ Important: Project Architecture Confusion

### The Correct Architecture (This Project)

**Project Name:** pbjs_engine (prebidjs-light)
**Live URL:** https://app.thenexusengine.com

**Stack:**
- **Backend:** Node.js 20 LTS + TypeScript + Fastify
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Databases:** PostgreSQL/SQLite + Redis + ClickHouse
- **ORM:** Drizzle
- **State:** Zustand
- **Build:** Vite

**Structure:**
```
apps/
├── admin/          # React admin dashboard
├── api/            # Fastify API server
└── wrapper/        # Publisher JS wrapper
```

---

## ⚠️ Files from Wrong Project Architecture

The following files in this directory were created for a **DIFFERENT project** with a Go-based architecture:

1. `CHAT_INTERFACE.md` - References `views/chat.html`, vanilla JS
2. `UI_BUG_FIXES.md` - References HTML templates, not React components
3. `AB_TESTING_IMPLEMENTATION.md` - Go backend specs, not Fastify

**Note:** The parent directory `/Users/andrewstreets/CLAUDE.md` also describes a Go + Gin project, suggesting you have multiple similar projects.

---

## Correct Documentation

For accurate information about THIS project (pbjs_engine), refer to:
- `README.md` - Project overview and setup
- `CLAUDE.md` - Development guidelines (correct for this project)
- API documentation in `apps/api/`
- Component structure in `apps/admin/src/`

---

## If You Want to Implement These Features

To implement the chat interface, UI fixes, and AB testing in THIS project:

1. **Chat Interface** → Build React components in `apps/admin/src/pages/`
2. **UI Fixes** → Apply to React components, not HTML files
3. **AB Testing** → Create Fastify routes + React UI

Would require complete rewrite to match React/Fastify architecture.
