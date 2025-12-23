# Book Worm

Book Worm is a word-grid game built with React, TypeScript, and Vite. Drag across the
letter grid to create words, score points, and try different modes ranging from quick
timed rounds to a literary Book Hunt that hides a title and author in the grid.

## Game modes

- **Classic**: 30-second rounds with a curated list of target words.
- **Speed Run**: 15-second rounds for quick matches and fast scoring.
- **Relaxed**: No timer, perfect for casual play.
- **Book Hunt**: Find a hidden book title and author, with optional hints and reveals.

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Tooling notes

- Word list data is generated automatically before builds via `npm run build:words`.
- The default book list lives in `src/books.txt`.

## Project structure

- `src/App.tsx`: game mode configuration and app shell.
- `src/GameArea.tsx`: board UI, timers, and round controls.
- `src/game/`: grid logic, scoring, word placement, and helpers.
