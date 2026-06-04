import type { GroupMatch } from "./types/index";

// Mutable module-level store for non-React files (bracketLogic, helpers).
// Populated by App.tsx immediately after loadAllData() resolves.

export let GROUPS: Record<string, string[]> = {};
export let GROUP_MATCHES: GroupMatch[] = [];
export let FLAGS: Record<string, string> = {};

export function initTournamentStore(
  groups: Record<string, string[]>,
  groupMatches: GroupMatch[],
  flags: Record<string, string>,
) {
  GROUPS = groups;
  GROUP_MATCHES = groupMatches;
  FLAGS = flags;
}
