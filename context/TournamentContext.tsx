import { createContext, useContext } from "react";
import type { TournamentConfig } from "../types/index";

export type { TournamentConfig };

export const TournamentContext = createContext<TournamentConfig>({
  groups: {},
  groupMatches: [],
  flags: {},
  bonusQuestions: [],
  knockoutRounds: [],
  matchDates: {},
});

export function useTournament(): TournamentConfig {
  return useContext(TournamentContext);
}

export function useFlag(): (team: string) => string {
  const { flags } = useTournament();
  return (team: string) => flags[team] ?? "🌍";
}
