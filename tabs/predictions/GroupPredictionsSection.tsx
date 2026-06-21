import { useGame } from "../../context/GameContext";
import { useTournament, useFlag } from "../../context/TournamentContext";
import { THEME } from "../../theme";
import { pointsForOutcome } from "../../helpers";
import SLabel from "../../components/SLabel";
import PointsBadge from "../../components/PointsBadge";
import GroupTableEditable from "../../components/GroupTableEditable";

interface Props { pi: number; isEditable: boolean; }

export default function GroupPredictionsSection({ pi, isEditable }: Props) {
  const { predictions, results, activePlayers, groupFilter, setPred, setTableOrder } = useGame();
  const { groups, groupMatches } = useTournament();
  const flag = useFlag();

  const pred       = predictions[pi];
  const tableOrder = pred?.tableOrder;
  const outcomes: Record<string, string | null> = Object.fromEntries(
    groupMatches.filter(m => m.group === groupFilter).map(m => [
      m.id, pred?.matchPredictions[m.id]?.outcome ?? null,
    ])
  );

  return (
    <>
      <SLabel mb={8}>
        Group {groupFilter} — {activePlayers[pi] || `Player ${pi + 1}`}'s predictions
      </SLabel>
      {groupMatches.filter(m => m.group === groupFilter).map(m => {
        const mp      = pred?.matchPredictions[m.id] ?? {};
        const actual  = results.matchResults[m.id];
        const outcome = mp.outcome;
        return (
          <div key={m.id} className="match-row">
            <span style={{ fontSize: 12, flex: 1, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
              {flag(m.home)} {m.home}
            </span>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {(["H", "D", "A"] as const).map(val => {
                const label = val === "H" ? "H" : val === "D" ? "U" : "B";
                return (
                  <button
                    key={val}
                    className="hub-btn"
                    onClick={() => isEditable && setPred(pi, m.id, "outcome", outcome === val ? null : val)}
                    style={{
                      background: outcome === val ? THEME.gold   : THEME.bgInput,
                      color:      outcome === val ? "#000"       : THEME.textMuted,
                      border:     `1.5px solid ${outcome === val ? THEME.gold : THEME.borderInput}`,
                      cursor:     isEditable ? "pointer" : "default",
                      opacity:    isEditable ? 1 : 0.6,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 12, flex: 1, fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
              {flag(m.away)} {m.away}
            </span>
            <div style={{ width: 28, flexShrink: 0 }}>
              {actual != null && <PointsBadge pts={pointsForOutcome(mp, actual)} />}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 12 }}>
        <SLabel mb={4}>
          Predicted standings
          {isEditable && (
            <span style={{ color: THEME.borderCard, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
              — ↑↓ swap tied teams
            </span>
          )}
        </SLabel>
        <GroupTableEditable
          group={groupFilter}
          teams={groups[groupFilter]}
          outcomes={outcomes}
          storedOrder={tableOrder?.[groupFilter]}
          onOrderChange={order => isEditable && setTableOrder(pi, groupFilter, order)}
          isEditable={isEditable}
        />
      </div>
    </>
  );
}
