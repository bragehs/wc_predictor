// ── Active tournament ─────────────────────────────────────────────────────────
// Change this single import to switch tournaments (e.g. "./euro_2028/bracket").
// The imported module must export:
//   FINAL_MATCH_ID, QUALIFICATION_ROUND_ID, THIRD_PLACE_COUNT,
//   ROUND_MATCH_IDS, BRACKET_FEEDS,
//   buildFirstKOBracket, getBestThirdPlaces, getKnockoutMatchup
export * from "./wc_2026/bracket";
