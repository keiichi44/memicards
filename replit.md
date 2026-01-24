# Armenian SRS - Spaced Repetition Flashcards

A customized spaced repetition system for learning Armenian vocabulary with Russian translations. Features the SM-2 algorithm, batch import, weekend learner mode, and progress tracking.

## Overview

This application helps you learn Armenian vocabulary using spaced repetition. Key features include:

- **SM-2 Algorithm**: Industry-standard spaced repetition scheduling
- **Armenian Typography**: Noto Serif Armenian font for clear text display
- **Card Structure**: Armenian word, Russian translation, example sentence (optional), mnemonic association (optional), difficulty star
- **Batch Import**: Import 50+ cards at once via CSV
- **Weekend Learner Mode**: Customizable review loads for weekdays vs weekends
- **Deck Organization**: Weekly decks with filtering (Due today, New, Starred)
- **Progress Dashboard**: Weekly goals, retention rate charts, difficult words list
- **Data Export**: Export cards and review history to CSV/JSON

## Tech Stack

- **Frontend**: React with TypeScript, Wouter for routing
- **UI Components**: Shadcn UI, Tailwind CSS
- **Charts**: Recharts for progress visualization
- **State**: React Query for data management
- **Storage**: LocalStorage (structured for easy database migration)
- **Algorithm**: SM-2 spaced repetition implementation

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── flashcard.tsx       # Flashcard display component
│   │   ├── review-session.tsx  # Review session manager
│   │   ├── deck-list.tsx       # Deck management
│   │   ├── card-list.tsx       # Card CRUD interface
│   │   ├── batch-import.tsx    # CSV import functionality
│   │   ├── progress-dashboard.tsx # Stats and charts
│   │   ├── settings-page.tsx   # User preferences
│   │   ├── app-sidebar.tsx     # Navigation sidebar
│   │   ├── theme-provider.tsx  # Dark/light mode
│   │   └── theme-toggle.tsx    # Theme switch button
│   ├── lib/
│   │   ├── sm2.ts              # SM-2 algorithm implementation
│   │   ├── storage.ts          # LocalStorage persistence layer
│   │   ├── queryClient.ts      # React Query config
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── home.tsx            # Main deck view
│   │   ├── import.tsx          # Batch import page
│   │   ├── progress.tsx        # Progress dashboard
│   │   └── settings.tsx        # Settings page
│   └── App.tsx                 # Main app with routing
shared/
└── schema.ts                   # TypeScript types and Zod schemas
server/
└── routes.ts                   # Express API routes
```

## Data Schema

### Card
- `armenian`: Armenian word (required)
- `russian`: Russian translation (required)
- `sentence`: Example sentence (optional)
- `association`: Mnemonic note (optional)
- `isStarred`: Difficulty marker
- `easeFactor`, `interval`, `repetitions`: SM-2 scheduling fields

### Deck
- `name`: Deck name (e.g., "Week 1")
- `description`: Optional description
- `cardCount`: Auto-calculated card count

## CSV Import Format

```csv
armenian,russian,sentence,association
գdelays,книга,Իdelays,гирька упала на книгу
սdelays,кофе,Еdelays,
```

Note: `sentence` and `association` columns are optional and can be empty.

## User Preferences

The app remembers:
- Weekend learner mode settings (weekday/weekend card limits)
- Starred card prioritization preference
- Weekly card target goal
- Theme preference (light/dark)

## Running the App

The application runs on port 5000 via the `npm run dev` command.

## Docker Deployment (Future)

The app is structured for easy containerization:
1. Frontend is a static React build
2. Backend is Express.js
3. Data layer uses LocalStorage but can migrate to PostgreSQL

To deploy on your own server later, export the codebase and create appropriate Dockerfile.

## Recent Changes

- Initial implementation of Armenian SRS app
- SM-2 algorithm with quality ratings (Again/Hard/Good/Easy)
- Weekend learner mode with customizable limits
- Batch CSV import with update-existing option
- Progress dashboard with weekly goals and retention charts
- Sample deck with 5 Armenian vocabulary cards
