# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
```

No test runner or linter is configured.

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Architecture

React + TypeScript + Vite SPA backed by Supabase (auth + Postgres).

### State: GameContext

`context/GameContext.tsx` is the central hub. `GameProvider` loads all app data on mount via a single `loadAllData()` call (12 parallel Supabase queries), then exposes it through `useGame()`. Everything — predictions, results, players, auth state, scoring, all setters — lives here.

`context/TournamentContext.tsx` is a lightweight companion that holds the static `TournamentConfig` (groups, fixtures, flags, bonus questions, knockout rounds). Both contexts are provided together inside `GameProvider`.

### Data flow

- **Load**: `db.ts:loadAllData()` bulk-fetches everything on startup. Results auto-refresh every 60 s and on `window.focus` via `loadResults()`.
- **Writes**: All mutations go through debounced savers in `hooks/useDebouncedSavers.ts`, which wrap the individual save functions in `db.ts`.
- **Predictions keying**: `AllPredictions` is `Record<number, PlayerPredictions>` — keyed by player *index* (position in the `players` array), not by name. Keep this in mind when reading or writing prediction data.

### Module-level tournament store

`tournamentStore.ts` holds `GROUPS`, `GROUP_MATCHES`, and `FLAGS` as plain mutable module variables. It exists so pure functions in `bracketLogic.ts` and `helpers.ts` can access tournament data without React context. `initTournamentStore()` is called once after `loadAllData()` resolves.

### Business logic

- `bracketLogic.ts` — group standings (real scores + tiebreakers), qualifier resolution, knockout bracket construction. Re-exports tournament-specific functions from `tournaments/active.ts`.
- `helpers.ts` — scoring helpers (`pointsForOutcome`, table position scoring), prediction effective order (merges stored manual ordering with computed standings for tied teams).
- `hooks/useScoring.ts` — computes scores for all players and exposes `calcScoreBreakdown(pi)` per player. Scores drive the Standings tab leaderboard.

### Tournament switching

`tournaments/active.ts` is a single re-export file. To add a new tournament (e.g. `euro_2028`), create `tournaments/euro_2028/bracket.ts` exporting the required contract (`FINAL_MATCH_ID`, `QUALIFICATION_ROUND_ID`, `THIRD_PLACE_COUNT`, `ROUND_MATCH_IDS`, `BRACKET_FEEDS`, `buildFirstKOBracket`, `getBestThirdPlaces`, `getKnockoutMatchup`), then change the import in `tournaments/active.ts`. Knockout round points come from the DB `knockout_rounds` table, not from the bracket file.

### Auth and roles

Supabase magic-link auth. A player must exist in the `players` table with `approved = true` to enter the app. `isAdmin` (from `players.is_admin`) bypasses the prediction lock date and unlocks the Setup tab. Unapproved users see a "pending" screen; unknown emails see "not registered."

### Scoring rules

- 1 pt per correct match outcome (H/D/A)
- 2 pt per correct group table position
- Knockout round points: per-round value from DB (`knockout_rounds.pts`)
- Bonus question points: per-question value from DB (`bonus_questions.pts`)
- Tournament winner correct prediction: `WinnerPoints` (30, in `config.ts`)

### Styling

All color tokens live in `theme.ts` as the `THEME` const. Components use inline styles referencing `THEME.*`. No CSS modules or Tailwind — just `index.css` for global resets and the Google Font import.
