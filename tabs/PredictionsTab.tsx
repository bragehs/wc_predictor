import type { AllPredictions, AllResults, MatchOutcome } from "../types/index";
import { COLORS } from "../config";
import { useTournament, useFlag } from "../context/TournamentContext";
import { THEME } from "../theme";
import { pointsForOutcome } from "../helpers";
import STitle from "../components/STitle";
import SLabel from "../components/SLabel";
import StatusBanner from "../components/StatusBanner";
import PtsPill from "../components/PtsPill";
import FilterBar from "../components/FilterBar";
import PointsBadge from "../components/PointsBadge";
import GroupTableEditable from "../components/GroupTableEditable";
import BracketPredictions from "../components/BracketPredictions";

interface PredictionsTabProps {
  activePlayers: string[];
  selectedPlayer: number;
  setSelectedPlayer: (i: number) => void;
  myPlayerIndex: number;
  groupFilter: string;
  setGroupFilter: (g: string) => void;
  predictions: AllPredictions;
  results: AllResults;
  setPred: (pi: number, matchId: string, side: string, val: MatchOutcome | null) => void;
  setTableOrder: (pi: number, group: string, order: string[]) => void;
  setBonusPred: (pi: number, qid: string, val: string) => void;
  setThirdPlacesPred: (pi: number, groups: string[]) => void;
  setKnockoutWinnerPred: (pi: number, matchId: string, team: string | null) => void;
  isAdmin: boolean;
  isLocked: boolean;
  lockDate: Date | null;
}

export default function PredictionsTab({
  activePlayers, selectedPlayer, setSelectedPlayer, myPlayerIndex,
  groupFilter, setGroupFilter,
  predictions, results,
  setPred, setTableOrder, setBonusPred, setThirdPlacesPred, setKnockoutWinnerPred,
  isAdmin, isLocked, lockDate,
}: PredictionsTabProps) {
  const { groups, groupMatches, bonusQuestions } = useTournament();
  const flag = useFlag();
  // Before lock, non-admins are pinned to their own player; after lock everyone can browse
  const showSwitcher = isAdmin || isLocked;
  const pi = showSwitcher ? selectedPlayer : myPlayerIndex;
  const isEditable = isAdmin || !isLocked;

  const groupFilters = Object.keys(groups).map(g => ({ key: g, label: g, activeColor: THEME.gold, activeTextColor: "#000" }));
  const extraFilters = [
    { key: "BONUS",   label: "Bonus",   activeColor: THEME.purple, activeTextColor: "#fff" },
    { key: "BRACKET", label: "Bracket", activeColor: THEME.red,    activeTextColor: "#fff" },
  ];

  return (
    <div>
      <STitle>Predictions</STitle>

      {isLocked && (
        <StatusBanner color="blue">
          🔒 Predictions locked{lockDate
            ? ` since ${lockDate.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })}`
            : ""}
        </StatusBanner>
      )}

      {isAdmin && (
        <StatusBanner color="green">Admin mode — editing all predictions.</StatusBanner>
      )}

      {showSwitcher && (
        <div className="hscroll" style={{ marginBottom: 12 }}>
          {activePlayers.map((p, i) => p ? (
            <button
              key={i}
              className="grp-btn"
              onClick={() => setSelectedPlayer(i)}
              style={{
                background: pi === i ? COLORS[i] : THEME.bgButton,
                color:      pi === i ? "#000" : THEME.textSecondary,
                border:     `1px solid ${pi === i ? COLORS[i] : THEME.borderCard}`,
                flexShrink: 0,
              }}
            >
              {p || `P${i + 1}`}
            </button>
          ) : null)}
        </div>
      )}

      <FilterBar filters={[...groupFilters, ...extraFilters]} active={groupFilter} onChange={setGroupFilter} />

      {groups[groupFilter] !== undefined && (() => {
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
                  <span style={{ fontSize: 10, color: THEME.textFaint, minWidth: 42, flexShrink: 0 }}>
                    {m.date}
                  </span>
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
                            background: outcome === val ? THEME.gold : THEME.bgInput,
                            color:      outcome === val ? "#000" : THEME.textMuted,
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
      })()}

      {groupFilter === "BONUS" && (
        <div>
          {bonusQuestions.map(bq => {
            const playerBonus = predictions[pi]?.bonus?.[bq.id] ?? "";
            const isCorrect   = predictions[pi]?.bonusCorrect?.[bq.id] ?? false;
            const actual      = results.bonusAnswers?.[bq.id];
            return (
              <div key={bq.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary }}>{bq.label}</span>
                  <PtsPill pts={bq.pts} color="gold" />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="bonus-input"
                    placeholder="Your answer…"
                    value={playerBonus}
                    onChange={e => isEditable && setBonusPred(pi, bq.id, e.target.value)}
                    readOnly={!isEditable}
                    style={{ opacity: isEditable ? 1 : 0.6 }}
                  />
                  {actual && <PointsBadge pts={isCorrect ? bq.pts : 0} />}
                </div>
                {actual && (
                  <div style={{ fontSize: 11, color: THEME.blue, marginTop: 3 }}>Actual: {actual}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {groupFilter === "BRACKET" && (
        <BracketPredictions
          pi={pi}
          predictions={predictions}
          results={results}
          setThirdPlacesPred={setThirdPlacesPred}
          setKnockoutWinnerPred={setKnockoutWinnerPred}
          isEditable={isEditable}
        />
      )}
    </div>
  );
}
