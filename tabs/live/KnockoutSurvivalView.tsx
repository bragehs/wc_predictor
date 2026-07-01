import { useTournament, useFlag } from "../../context/TournamentContext";
import { useGame } from "../../context/GameContext";
import { THEME } from "../../theme";
import { COLORS, WinnerPoints } from "../../config";
import {
  getQualifiers, buildFirstKOBracket, FINAL_MATCH_ID,
  BRACKET_FEEDS, getKnockoutMatchup,
} from "../../bracketLogic";
import { buildPredFirstKOBracket } from "../../helpers";

const isPlaceholder = (t: string) =>
  /^[A-Z]\d$/.test(t) || t === "3rd TBD" || /^3rd\([A-Z]\)$/.test(t);

function fmtOsloTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("no-NO", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo",
  });
}

interface Props {
  todayStart: Date;
  todayEnd: Date;
}

export default function KnockoutSurvivalView({ todayStart, todayEnd }: Props) {
  const { knockoutRounds, matchDates } = useTournament();
  const { predictions, results, activePlayers } = useGame();
  const flag = useFlag();

  const actKoW = results.knockoutWinners ?? {};
  const firstKOBracket = buildFirstKOBracket(getQualifiers(results), null, results.tiebreakers);

  const players = activePlayers
    .map((name, pi) => ({ name, pi }))
    .filter(p => !!p.name);

  // Pre-build each player's predicted R32 bracket once
  const predR32: Record<number, ReturnType<typeof buildPredFirstKOBracket>> = {};
  players.forEach(({ pi }) => { predR32[pi] = buildPredFirstKOBracket(pi, predictions); });

  // Exit round index for a player + team:
  //  -1 = not in player's knockout bracket
  //   0 = exits in knockoutRounds[0] (R32)
  //   ...
  //   knockoutRounds.length = wins tournament
  function getExitRoundIdx(pi: number, team: string): number {
    const r32Match = predR32[pi]?.find(m => m.home === team || m.away === team);
    if (!r32Match) return -1;

    let currentMatchId = r32Match.id;
    for (let i = 0; i < knockoutRounds.length; i++) {
      const winner = predictions[pi]?.knockoutWinners?.[currentMatchId];
      if (winner !== team) return i;
      const next = Object.entries(BRACKET_FEEDS).find(([, feeds]) => feeds.includes(currentMatchId));
      if (!next) return knockoutRounds.length;
      currentMatchId = next[0];
    }
    return knockoutRounds.length;
  }

  // Today's knockout match IDs sorted by kick-off time
  const todayMatchIds = knockoutRounds
    .flatMap(r => r.matchIds)
    .filter(mid => {
      const d = matchDates[mid];
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= todayStart.getTime() && t < todayEnd.getTime();
    })
    .sort((a, b) => (matchDates[a] ?? "").localeCompare(matchDates[b] ?? ""));

  function renderPlayerChips(pis: { name: string; pi: number }[]) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {pis.map(({ name, pi }) => (
          <span key={pi} style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            background: COLORS[pi] + "28", color: COLORS[pi], border: `1px solid ${COLORS[pi]}55`,
          }}>{name}</span>
        ))}
      </div>
    );
  }

  function renderTeamSection(team: string) {
    if (isPlaceholder(team)) return null;

    const buckets = new Map<number, { name: string; pi: number }[]>();
    for (const p of players) {
      const idx = getExitRoundIdx(p.pi, team);
      if (!buckets.has(idx)) buckets.set(idx, []);
      buckets.get(idx)!.push(p);
    }

    const rows: { key: number; label: string }[] = [
      { key: -1, label: "Not in knockout" },
      ...knockoutRounds.map((r, i) => ({ key: i, label: r.label })),
      { key: knockoutRounds.length, label: "Winner 🏆" },
    ];

    const nonEmptyRows = rows.filter(({ key }) => (buckets.get(key)?.length ?? 0) > 0);
    if (nonEmptyRows.length === 0) return null;

    return (
      <div>
        <div style={{ padding: "6px 12px 2px", fontSize: 13, fontWeight: 800, color: THEME.textPrimary }}>
          {flag(team)} {team}
        </div>
        {nonEmptyRows.map(({ key, label }) => (
          <div key={key} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "3px 12px 3px 14px",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: THEME.textMuted,
              minWidth: 96, paddingTop: 2, flexShrink: 0,
            }}>
              {label}
            </div>
            {renderPlayerChips(buckets.get(key)!)}
          </div>
        ))}
      </div>
    );
  }

  const champion = actKoW[FINAL_MATCH_ID] ?? null;

  return (
    <div>
      {todayMatchIds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0 16px", color: THEME.textMuted, fontSize: 14 }}>
          No knockout matches today.
        </div>
      ) : (
        todayMatchIds.map(mid => {
          const { home, away } = getKnockoutMatchup(mid, firstKOBracket, actKoW);
          const winner = actKoW[mid] ?? null;
          const dateStr = matchDates[mid];

          return (
            <div key={mid} style={{
              marginBottom: 14,
              background: THEME.bgCard,
              border: `1px solid ${THEME.borderCard}`,
              borderRadius: 10,
              overflow: "hidden",
            }}>
              {/* Match header — same layout as GroupDayView */}
              <div style={{
                padding: "7px 12px",
                background: THEME.bgInset,
                borderBottom: `1px solid ${THEME.borderFaint}`,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary, flex: 1, textAlign: "right" }}>
                  {!isPlaceholder(home) ? `${flag(home)} ${home}` : home}
                </span>
                <span style={{ fontSize: 11, color: THEME.textFaint, fontWeight: 700, flexShrink: 0, minWidth: 40, textAlign: "center" }}>
                  {winner ? "FT" : dateStr ? fmtOsloTime(dateStr) : "vs"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary, flex: 1 }}>
                  {!isPlaceholder(away) ? `${away} ${flag(away)}` : away}
                </span>
              </div>

              {/* Winner indicator (if match done) */}
              {winner && (
                <div style={{
                  padding: "3px 12px",
                  fontSize: 11, fontWeight: 700, color: THEME.green,
                  borderBottom: `1px solid ${THEME.borderFaint}`,
                }}>
                  {flag(winner)} {winner} won
                </div>
              )}

              {/* Home team breakdown */}
              <div style={{ paddingTop: 6, paddingBottom: 4 }}>
                {renderTeamSection(home)}
              </div>

              {/* Divider between teams */}
              <div style={{ height: 1, background: THEME.borderFaint, margin: "2px 0" }} />

              {/* Away team breakdown */}
              <div style={{ paddingTop: 4, paddingBottom: 6 }}>
                {renderTeamSection(away)}
              </div>
            </div>
          );
        })
      )}

      {/* Winner prediction overview */}
      <div style={{ marginTop: 8, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          Champion · +{WinnerPoints} pts
        </div>
        <div style={{ background: THEME.bgCard, border: `1px solid ${THEME.borderCard}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${THEME.borderFaint}`, fontSize: 18, fontWeight: 700, color: THEME.textPrimary }}>
            {champion ? `${flag(champion)} ${champion}` : "TBD"}
          </div>
          {players.map(({ name, pi }, i, arr) => {
            const pick = predictions[pi]?.knockoutWinners?.[FINAL_MATCH_ID] ?? null;
            const isCorrect = !!champion && pick === champion;
            const isWrong = !!champion && !!pick && pick !== champion;
            return (
              <div key={pi} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: i < arr.length - 1 ? `1px solid ${THEME.borderFaint}` : "none",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[pi] }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isCorrect ? THEME.green : isWrong ? THEME.red : THEME.textFaint }}>
                  {pick ? `${flag(pick)} ${pick}` : "—"}
                  {isCorrect && " ✓"}
                  {isWrong && " ✗"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
