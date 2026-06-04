import type { AllPredictions, AllResults, MatchOutcome, MatchPrediction } from "../types/index";
import { COLORS } from "../config";
import { useTournament, useFlag } from "../context/TournamentContext";
import { THEME } from "../theme";
import { pointsForOutcome } from "../helpers";
import STitle from "../components/STitle";
import PointsBadge from "../components/PointsBadge";
import GroupTableEditable from "../components/GroupTableEditable";
import BracketPredictions from "../components/BracketPredictions";

interface PredictionsTabProps {
  activePlayers: string[];
  selectedPlayer: number;
  setSelectedPlayer: (i: number) => void;
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
  activePlayers, selectedPlayer, setSelectedPlayer,
  groupFilter, setGroupFilter,
  predictions, results,
  setPred, setTableOrder, setBonusPred, setThirdPlacesPred, setKnockoutWinnerPred,
  isAdmin, isLocked, lockDate,
}: PredictionsTabProps) {
  const { groups, groupMatches, bonusQuestions } = useTournament();
  const flag = useFlag();
  const pi = selectedPlayer;
  const isEditable = isAdmin || !isLocked;

  return (
    <div>
      <STitle>Predictions</STitle>

      {isLocked && (
        <div style={{ background:THEME.bgCard,border:`1px solid ${THEME.blueBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:THEME.blue,fontFamily:"'Barlow',Arial" }}>
          🔒 Predictions locked{lockDate ? ` since ${lockDate.toLocaleDateString("no-NO", {day:"numeric",month:"long",year:"numeric"})}` : ""}. Contact the organizer to change.
        </div>
      )}

      {isAdmin && (
        <div style={{ background:THEME.bgCard,border:`1px solid ${THEME.greenBorder}`,borderRadius:8,padding:"8px 14px",marginBottom:14,fontSize:12,color:THEME.green,fontFamily:"'Barlow',Arial" }}>
          Admin mode — editing all predictions.
        </div>
      )}

      <div className="hscroll" style={{ marginBottom:12 }}>
        {activePlayers.map((p, i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setSelectedPlayer(i)}
            style={{ background:selectedPlayer===i?COLORS[i]:THEME.bgButton,color:selectedPlayer===i?"#000":THEME.textSecondary,border:`1px solid ${selectedPlayer===i?COLORS[i]:THEME.borderCard}`,flexShrink:0 }}>
            {p || `P${i + 1}`}
          </button>
        ) : null)}
      </div>

      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>
        {Object.keys(groups).map(g => (
          <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
            style={{ background:groupFilter===g?THEME.gold:THEME.bgButton,color:groupFilter===g?"#000":THEME.textSecondary,border:`1px solid ${groupFilter===g?THEME.gold:THEME.borderCard}` }}>
            {g}
          </button>
        ))}
        <button className="grp-btn" onClick={() => setGroupFilter("BONUS")}
          style={{ background:groupFilter==="BONUS"?THEME.purple:THEME.bgButton,color:groupFilter==="BONUS"?"#fff":THEME.textSecondary,border:`1px solid ${groupFilter==="BONUS"?THEME.purple:THEME.borderCard}` }}>
          Bonus
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("BRACKET")}
          style={{ background:groupFilter==="BRACKET"?THEME.red:THEME.bgButton,color:groupFilter==="BRACKET"?"#fff":THEME.textSecondary,border:`1px solid ${groupFilter==="BRACKET"?THEME.red:THEME.borderCard}` }}>
          Bracket
        </button>
      </div>

      {groups[groupFilter] !== undefined && (() => {
        const pred = predictions[pi] ?? {};
        const tableOrder = pred.tableOrder as Record<string, string[]> | undefined;
        const outcomes: Record<string, string | null> = Object.fromEntries(
          groupMatches.filter(m => m.group === groupFilter).map(m => {
            const mp = pred[m.id] as MatchPrediction | undefined;
            return [m.id, mp?.outcome ?? null];
          })
        );
        return (
          <>
            <div style={{ fontSize:10,color:THEME.textFaint,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
              Group {groupFilter} — {activePlayers[pi] || `Player ${pi + 1}`}'s predictions
            </div>
            {groupMatches.filter(m => m.group === groupFilter).map(m => {
              const mp = pred[m.id] as MatchPrediction | undefined ?? {};
              const actual = results[m.id];
              const outcome = mp.outcome;
              return (
                <div key={m.id} className="match-row">
                  <span style={{ fontSize:10,color:THEME.textFaint,minWidth:42,flexShrink:0 }}>{m.date}</span>
                  <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap",color:THEME.textPrimary }}>{flag(m.home)} {m.home}</span>
                  <div style={{ display:"flex",gap:3,flexShrink:0 }}>
                    {(["H","D","A"] as const).map(val => {
                      const label = val === "H" ? "H" : val === "D" ? "U" : "B";
                      return (
                        <button key={val} className="hub-btn"
                          onClick={() => isEditable && setPred(pi, m.id, "outcome", outcome === val ? null : val)}
                          style={{
                            background: outcome === val ? THEME.gold : THEME.bgInput,
                            color:      outcome === val ? "#000" : THEME.textMuted,
                            border:     `1.5px solid ${outcome === val ? THEME.gold : THEME.borderInput}`,
                            cursor:     isEditable ? "pointer" : "default",
                            opacity:    isEditable ? 1 : 0.6,
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap",color:THEME.textPrimary }}>{flag(m.away)} {m.away}</span>
                  {actual != null && <PointsBadge pts={pointsForOutcome(mp, actual)}/>}
                </div>
              );
            })}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10,color:THEME.textFaint,letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>
                Predicted standings
                {isEditable && <span style={{ color:THEME.borderCard,marginLeft:6,textTransform:"none",letterSpacing:0 }}>— ↑↓ swap tied teams</span>}
              </div>
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
            const playerBonus = (predictions[pi]?.bonus as Record<string, string> | undefined)?.[bq.id] ?? "";
            const isCorrect   = (predictions[pi]?.bonusCorrect as Record<string, boolean> | undefined)?.[bq.id] ?? false;
            const actual      = (results.bonusAnswers as Record<string, string> | undefined)?.[bq.id];
            return (
              <div key={bq.id} style={{ marginBottom:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:THEME.textPrimary }}>{bq.label}</span>
                  <span style={{ fontSize:10,background:THEME.goldBg,color:THEME.gold,border:`1px solid ${THEME.goldBorder}`,borderRadius:4,padding:"1px 7px",fontWeight:700 }}>+{bq.pts} pts</span>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <input className="bonus-input" placeholder="Your answer…" value={playerBonus}
                    onChange={e => isEditable && setBonusPred(pi, bq.id, e.target.value)}
                    readOnly={!isEditable}
                    style={{ opacity: isEditable ? 1 : 0.6 }}
                  />
                  {actual && <PointsBadge pts={isCorrect ? bq.pts : 0}/>}
                </div>
                {actual && <div style={{ fontSize:11,color:THEME.blue,marginTop:3 }}>Actual: {actual}</div>}
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
