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
- **Authentication**: Clerk (email, Google, Facebook login + password recovery)
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
│   │   ├── project-context.tsx  # ProjectProvider context for active project
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── auth.tsx            # Login/signup page with Clerk
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
- **projects**: id, name, userId, createdAt (top-level organization containers)
- **decks**: id, name, language, description, userId, projectId, createdAt
- **cards**: id, deckId, armenian (word), russian (translation), sentence, association, isStarred, isActive, easeFactor, interval, repetitions, nextReviewDate, lastReviewDate, createdAt
- **reviews**: id, cardId, quality, reviewedAt, previousInterval, newInterval
- **settings**: id, userId, projectId, weekendLearnerMode, weekdayNewCards, weekdayReviewCards, weekendNewCards, weekendReviewCards, prioritizeStarred, weeklyCardTarget

## API Endpoints

All API endpoints (except `/api/health`) require Clerk authentication via `requireAuth()` middleware. The authenticated user's ID is extracted from the Clerk session and used to scope data.

- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project (ownership check)
- `DELETE /api/projects/:id` - Delete project and cascade (ownership check, prevents deleting last)
- `GET /api/decks` - List user's decks with card counts (optional ?projectId= filter)
- `POST /api/decks` - Create deck (auto-assigns userId)
- `PATCH /api/decks/:id` - Update deck (ownership check)
- `DELETE /api/decks/:id` - Delete deck and its cards (ownership check)
- `POST /api/decks/:id/duplicate` - Duplicate deck with optional swap
- `GET /api/cards` - List cards (optional ?projectId= or ?deckId= filter, ownership validated)
- `POST /api/cards` - Create card
- `PATCH /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/:id/review` - Submit review with SM-2 calculation
- `GET /api/reviews` - List review history (optional ?projectId= filter)
- `POST /api/import` - Batch import cards (deck ownership check)
- `GET /api/export` - Export user's data as JSON (optional ?projectId= filter)
- `GET /api/settings` - Get user's settings (optional ?projectId= for per-project settings)
- `PATCH /api/settings` - Update user's settings (optional ?projectId=)
- `POST /api/auth/claim-data` - Assign unowned decks to first user (migration)

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

## Authentication

The app uses Clerk for authentication:
- **Login methods**: Email/password, Google, Facebook
- **Password recovery**: Handled by Clerk's built-in flow
- **Session management**: Clerk handles sessions; backend uses `@clerk/express` middleware
- **Data scoping**: Each user sees only their own decks, cards, reviews, and settings
- **Migration**: First user to sign in automatically claims any pre-existing unowned decks
- **Environment variables**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Recent Changes

- Added project organization layer: projects as top-level containers for decks, settings, and progress
- ProjectProvider context with ProjectSelector dropdown in header for switching between projects
- Auto-create default "Learning project" on first login, auto-name new projects incrementally
- All views (decks, cards, reviews, settings, progress, import, export) scoped by active projectId
- Project deletion with cascade (prevents deleting last project)
- Settings renamed to "Project Settings" with per-project configuration
- Added ownership validation for projectId on all endpoints (security hardening)
- Added Clerk authentication with email, Google, Facebook login + password recovery
- Added deck duplication feature (as-is and swapped translations)
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
