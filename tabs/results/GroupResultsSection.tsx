import { useGame } from "../../context/GameContext";
import { useTournament, useFlag } from "../../context/TournamentContext";
import { THEME } from "../../theme";
import SLabel from "../../components/SLabel";
import GroupTable from "../../components/GroupTable";
import TiebreakerSection from "../../components/TiebreakerSection";

export default function GroupResultsSection() {
  const { results, setResult, setTiebreaker, isResultsLocked, groupFilter } = useGame();
  const { groups, groupMatches } = useTournament();
  const flag = useFlag();
  const isLocked = isResultsLocked;

  return (
    <>
      {groupMatches.filter(m => m.group === groupFilter).map(m => {
        const actual = results.matchResults[m.id] ?? {};
        return (
          <div key={m.id} className="match-row">
            <span style={{ fontSize: 10, color: THEME.textFaint, minWidth: 42, flexShrink: 0 }}>
              {m.date}
            </span>
            <span style={{ fontSize: 12, flex: 1, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
              {flag(m.home)} {m.home}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <input
                className="score-input actual"
                type="number" min={0} max={99}
                value={actual.home ?? ""}
                onChange={e => !isLocked && setResult(m.id, "home", e.target.value)}
                readOnly={isLocked}
                style={{ opacity: isLocked ? 0.5 : 1 }}
                placeholder="0"
              />
              <span style={{ color: THEME.textFaint, fontSize: 11 }}>–</span>
              <input
                className="score-input actual"
                type="number" min={0} max={99}
                value={actual.away ?? ""}
                onChange={e => !isLocked && setResult(m.id, "away", e.target.value)}
                readOnly={isLocked}
                style={{ opacity: isLocked ? 0.5 : 1 }}
                placeholder="0"
              />
            </div>
            <span style={{ fontSize: 12, flex: 1, fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
              {flag(m.away)} {m.away}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 12 }}>
        <SLabel mb={6}>Group {groupFilter} Standings</SLabel>
        <GroupTable group={groupFilter} teams={groups[groupFilter]} results={results} highlight />
      </div>
      <TiebreakerSection group={groupFilter} results={results} setTiebreaker={setTiebreaker} isLocked={isLocked} />
    </>
  );
}
