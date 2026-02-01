# memicards - Spaced Repetition Flashcards

A universal spaced repetition system for learning vocabulary in any language. Features the SM-2 algorithm, batch import, weekend learner mode, and progress tracking with cross-device synchronization via PostgreSQL.

## Overview

This application helps you learn vocabulary using spaced repetition. Key features include:

- **SM-2 Algorithm**: Industry-standard spaced repetition scheduling
- **Multi-Language Support**: Each deck has its own language setting for flexible learning
- **Card Structure**: Word, translation, example sentence (optional), mnemonic association (optional), difficulty star
- **Batch Import**: Import 50+ cards at once via CSV with configurable separator
- **Weekend Learner Mode**: Customizable review loads for weekdays vs weekends
- **Deck Organization**: Weekly decks with filtering (Due today, New, Starred)
- **Progress Dashboard**: Weekly goals, retention rate charts, difficult words list
- **Practice Mode**: Casual review without statistics tracking
- **Data Export**: Export cards and review history to CSV/JSON
- **Cross-Device Sync**: PostgreSQL database for data persistence

## Tech Stack

- **Frontend**: React with TypeScript, Wouter for routing
- **UI Components**: Shadcn UI, Tailwind CSS
- **Charts**: Recharts for progress visualization
- **State**: React Query for data fetching with cache invalidation
- **Database**: PostgreSQL with Drizzle ORM
- **Algorithm**: SM-2 spaced repetition implementation (server-side)

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── flashcard.tsx       # Flashcard display component
│   │   ├── review-session.tsx  # Review session manager
│   │   ├── practice-session.tsx # Practice mode (no stats)
│   │   ├── deck-list.tsx       # Deck management
│   │   ├── card-list.tsx       # Card CRUD interface
│   │   ├── batch-import.tsx    # CSV import functionality
│   │   ├── progress-dashboard.tsx # Stats and charts
│   │   ├── settings-page.tsx   # User preferences
│   │   ├── app-sidebar.tsx     # Navigation sidebar
│   │   ├── theme-provider.tsx  # Dark/light mode
│   │   └── theme-toggle.tsx    # Theme switch button
│   ├── lib/
│   │   ├── sm2.ts              # Client-side SM-2 utilities
│   │   ├── storage.ts          # CSV parsing and export utilities
│   │   ├── queryClient.ts      # React Query config with API helpers
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── home.tsx            # Main deck view
│   │   ├── import.tsx          # Batch import page
│   │   ├── progress.tsx        # Progress dashboard
│   │   └── settings.tsx        # Settings page
│   └── App.tsx                 # Main app with routing
shared/
└── schema.ts                   # Database schema with Drizzle and Zod
server/
├── db.ts                       # Database connection
├── storage.ts                  # Database operations interface
├── sm2.ts                      # Server-side SM-2 algorithm
└── routes.ts                   # Express API routes
```

## Database Schema

### Tables (PostgreSQL)
- **decks**: id, name, language, description, createdAt
- **cards**: id, deckId, armenian (word), russian (translation), sentence, association, isStarred, isActive, easeFactor, interval, repetitions, nextReviewDate, lastReviewDate, createdAt
- **reviews**: id, cardId, quality, reviewedAt, previousInterval, newInterval
- **settings**: id, weekendLearnerMode, weekdayNewCards, weekdayReviewCards, weekendNewCards, weekendReviewCards, prioritizeStarred, weeklyCardTarget

## API Endpoints

- `GET /api/decks` - List all decks with card counts
- `POST /api/decks` - Create deck
- `PATCH /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck and its cards
- `GET /api/cards` - List cards (optional ?deckId filter)
- `POST /api/cards` - Create card
- `PATCH /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/:id/review` - Submit review with SM-2 calculation
- `GET /api/reviews` - List review history
- `POST /api/import` - Batch import cards
- `GET /api/export` - Export all data as JSON
- `GET /api/settings` - Get settings
- `PATCH /api/settings` - Update settings

## CSV Import Format

```csv
word,translation,sentence,association
hello,привет,Hello! How are you?,greeting word
book,книга,The book is on the table,reading material
```

Note: `sentence` and `association` columns are optional and can be empty. Supports comma or semicolon separators. Also accepts legacy headers: armenian, russian.

## User Preferences

The app remembers (stored in database):
- Weekend learner mode settings (weekday/weekend card limits)
- Starred card prioritization preference
- Weekly card target goal
- Theme preference (light/dark) stored locally

## Running the App

The application runs on port 5000 via the `npm run dev` command.

## Recent Changes

- Added card active/inactive toggle feature - enable/disable individual cards for review sessions
- Added mobile bottom navigation bar for better mobile experience
- Migrated from localStorage to PostgreSQL database
- Added React Query for data fetching with proper cache invalidation
- Server-side SM-2 algorithm for consistent scheduling
- Cross-device synchronization support
- Practice Mode for casual review without tracking
- Improved batch import with configurable CSV separator

## Card Active Toggle

Cards can be individually enabled/disabled for review sessions:
- **Active cards** (default): Included in review and practice sessions
- **Inactive cards**: Excluded from sessions but remain in the deck
- Toggle via checkbox in the card list view
- Deck cards show "X off" count for inactive cards
- Useful for progressive learning (enable cards as you progress through lessons)
