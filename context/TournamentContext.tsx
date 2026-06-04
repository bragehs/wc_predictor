import { createContext, useContext } from "react";
import type { GroupMatch, BonusQuestion, KnockoutRoundMeta } from "../types/index";

export interface TournamentConfig {
  groups: Record<string, string[]>;
  groupMatches: GroupMatch[];
  flags: Record<string, string>;
  bonusQuestions: BonusQuestion[];
  knockoutRounds: KnockoutRoundMeta[];
}

const TournamentContext = createContext<TournamentConfig>({
  groups: {},
  groupMatches: [],
  flags: {},
  bonusQuestions: [],
  knockoutRounds: [],
});

export const TournamentProvider = TournamentContext.Provider;

export function useTournament(): TournamentConfig {
  return useContext(TournamentContext);
}

export function useFlag(): (team: string) => string {
  const { flags } = useTournament();
  return (team: string) => flags[team] ?? "🌍";
}
