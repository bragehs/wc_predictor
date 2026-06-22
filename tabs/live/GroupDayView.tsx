import { useTournament, useFlag } from "../../context/TournamentContext";
import { useGame } from "../../context/GameContext";
import { THEME } from "../../theme";
import { COLORS } from "../../config";

function fmtOsloTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("no-NO", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo",
  });
}

interface Props {
  todayStart: Date;
  todayEnd: Date;
}

export default function GroupDayView({ todayStart, todayEnd }: Props) {
  const { groupMatches } = useTournament();
  const { predictions, results, activePlayers } = useGame();
  const flag = useFlag();

  const todayMatches = groupMatches.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date);
    return d >= todayStart && d < todayEnd;
  });

  if (todayMatches.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: THEME.textMuted, fontSize: 14 }}>
        No group stage matches today.
      </div>
    );
  }

  return (
    <div>
      {todayMatches.map(m => {
        const actual = results.matchResults[m.id];
        const h = actual?.home !== undefined && actual?.home !== "" ? Number(actual.home) : null;
        const a = actual?.away !== undefined && actual?.away !== "" ? Number(actual.away) : null;
        const actualOutcome = h !== null && a !== null && !isNaN(h) && !isNaN(a)
          ? h > a ? "H" : h < a ? "A" : "D"
          : null;

        const buckets: Record<"H" | "D" | "A", number[]> = { H: [], D: [], A: [] };
        activePlayers.forEach((_, pi) => {
          const o = predictions[pi]?.matchPredictions[m.id]?.outcome;
          if (o === "H" || o === "D" || o === "A") buckets[o].push(pi);
        });

        return (
          <div key={m.id} style={{
            marginBottom: 14,
            background: THEME.bgCard,
            border: `1px solid ${THEME.borderCard}`,
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "7px 12px",
              background: THEME.bgInset,
              borderBottom: `1px solid ${THEME.borderFaint}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary, flex: 1, textAlign: "right" }}>
                {flag(m.home)} {m.home}
              </span>
              <span style={{ fontSize: 11, color: THEME.textFaint, fontWeight: 700, flexShrink: 0, minWidth: 40, textAlign: "center" }}>
                {actualOutcome !== null
                  ? `${actual!.home}–${actual!.away}`
                  : m.date ? fmtOsloTime(m.date) : "vs"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary, flex: 1 }}>
                {m.away} {flag(m.away)}
              </span>
            </div>

            {(["H", "D", "A"] as const).map((outcome, i) => {
              const label = outcome === "H" ? "H" : outcome === "D" ? "U" : "B";
              const correct = actualOutcome === outcome;
              const wrong = actualOutcome !== null && !correct;
              return (
                <div key={outcome} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
                  background: correct ? THEME.greenBg : "transparent",
                  borderTop: i > 0 ? `1px solid ${THEME.borderFaint}` : "none",
                  opacity: wrong ? 0.4 : 1,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                    fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: correct ? THEME.green : THEME.bgButton,
                    color: correct ? "#fff" : THEME.textMuted,
                    border: `1.5px solid ${correct ? THEME.green : THEME.borderCard}`,
                  }}>{label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
                    {buckets[outcome].length === 0
                      ? <span style={{ fontSize: 11, color: THEME.textFaint }}>—</span>
                      : buckets[outcome].map(pi => (
                          <span key={pi} style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                            background: COLORS[pi] + "28",
                            color: COLORS[pi],
                            border: `1px solid ${COLORS[pi]}55`,
                          }}>{activePlayers[pi]}</span>
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
