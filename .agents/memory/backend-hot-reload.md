---
name: Backend hot-reload gap
description: tsx runs without --watch so server code changes are NOT picked up until the workflow is explicitly restarted.
---

`npm run dev` runs `NODE_ENV=development tsx server/index.ts` — plain `tsx`, not `tsx --watch`. Vite handles frontend HMR automatically, but the Express backend does NOT restart on file changes.

**Why:** The dev script is fixed and must not be modified (package.json edits are forbidden).

**How to apply:** After any change to `server/` files, call `restart_workflow({ name: "Start application" })` to make the changes live. Without this, the running server continues executing the old code and changes appear to have no effect.
