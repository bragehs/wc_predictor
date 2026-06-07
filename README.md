# FIFA World Cup 2026 Predictor

A multiplayer prediction tracker for the 2026 World Cup. Players predict match outcomes, group standings, and the knockout bracket. Results are entered live and a leaderboard updates automatically.

## Stack

React + TypeScript + Vite, backed by Supabase (auth + database).

## Dev setup

```bash
npm install
npm run dev
```

Requires a `.env` file with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## How it works

- Players log in via magic link (email)
- Each player submits predictions before the lock date
- Admin enters real results as the tournament progresses
- Scoring: 1pt per correct match outcome, 2pt per correct group standing position, bonus points for correct knockout bracket picks
- Admin manages players, fixtures, and bonus questions from the Setup tab
