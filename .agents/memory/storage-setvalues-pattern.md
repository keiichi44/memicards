---
name: Storage setValues allowlist
description: updateDeck (and similar methods) use an explicit setValues object, not a spread — new fields must be manually added or they are silently dropped.
---

`server/storage.ts` `updateDeck` builds a typed `setValues` object with explicit `if (deck.field !== undefined) setValues.field = deck.field` guards.

**Why:** Prevents accidental overwrites of unrelated fields. But the downside is that every new deck column must be explicitly added to both the type annotation and the conditional block.

**How to apply:** Whenever a new column is added to the `decks` table, immediately add it to `updateDeck`'s `setValues` type AND the corresponding `if` guard. Same pattern applies to any other storage update methods with explicit allowlists.
