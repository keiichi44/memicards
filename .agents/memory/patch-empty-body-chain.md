---
name: PATCH empty-body failure chain
description: Express res.json(undefined) sends empty body; client fetch().json() then throws; mutation fails silently and onSuccess/invalidateQueries never fires.
---

`res.json(undefined)` in Express produces a 200 response with an empty body (no JSON). On the client, `response.json()` throws `SyntaxError: Unexpected end of JSON input`. The mutation is marked failed, `onSuccess` is skipped, `invalidateQueries` is never called, and the UI never updates — all silently.

**Why:** Easy to hit when a storage method can return `undefined` (e.g. empty setValues → early return) and the route doesn't guard against it.

**How to apply:**
- In PATCH routes, always use `res.json(updated ?? existingRecord)` so there is always a valid JSON body.
- In mutation `onSuccess`, use `queryClient.setQueryData(key, updatedRecord)` in addition to `invalidateQueries` so the cache updates immediately from the response without waiting for a refetch.
