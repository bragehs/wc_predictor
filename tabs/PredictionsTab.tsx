import type { AllPredictions, AllResults, MatchOutcome, MatchPrediction } from "../types/index";
import { GROUPS, GROUP_MATCHES, flag } from "../data";
import { BONUS_QUESTIONS, COLORS } from "../config";
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
  const pi = selectedPlayer;
  const isEditable = isAdmin || !isLocked;

  return (
    <div>
      <STitle>Predictions</STitle>

      {isLocked && (
        <div style={{ background:"#1c1400",border:"1px solid #f9731633",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#f97316",fontFamily:"'Barlow',Arial" }}>
          🔒 Predictions locked{lockDate ? ` since ${lockDate.toLocaleDateString("no-NO", {day:"numeric",month:"long",year:"numeric"})}` : ""}. Contact the organizer to change.
        </div>
      )}

      {isAdmin && (
        <div style={{ background:"#001c0a",border:"1px solid #10b98133",borderRadius:8,padding:"8px 14px",marginBottom:14,fontSize:12,color:"#10b981",fontFamily:"'Barlow',Arial" }}>
          Admin mode — editing all predictions.
        </div>
      )}

      <div className="hscroll" style={{ marginBottom:12 }}>
        {activePlayers.map((p, i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setSelectedPlayer(i)}
            style={{ background:selectedPlayer===i?COLORS[i]:"#12121c",color:selectedPlayer===i?"#000":"#aaa",border:`1px solid ${selectedPlayer===i?COLORS[i]:"#222"}`,flexShrink:0 }}>
            {p || `P${i + 1}`}
          </button>
        ) : null)}
      </div>

      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>
        {Object.keys(GROUPS).map(g => (
          <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
            style={{ background:groupFilter===g?"#f97316":"#12121c",color:groupFilter===g?"#000":"#888",border:`1px solid ${groupFilter===g?"#f97316":"#222"}` }}>
            {g}
          </button>
        ))}
        <button className="grp-btn" onClick={() => setGroupFilter("BONUS")}
          style={{ background:groupFilter==="BONUS"?"#a855f7":"#12121c",color:groupFilter==="BONUS"?"#fff":"#888",border:`1px solid ${groupFilter==="BONUS"?"#a855f7":"#222"}` }}>
          Bonus
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("BRACKET")}
          style={{ background:groupFilter==="BRACKET"?"#f43f5e":"#12121c",color:groupFilter==="BRACKET"?"#fff":"#888",border:`1px solid ${groupFilter==="BRACKET"?"#f43f5e":"#222"}` }}>
          Bracket
        </button>
      </div>

      {!["BONUS", "BRACKET"].includes(groupFilter) && (() => {
        const pred = predictions[pi] ?? {};
        const tableOrder = pred.tableOrder as Record<string, string[]> | undefined;
        const outcomes: Record<string, string | null> = Object.fromEntries(
          GROUP_MATCHES.filter(m => m.group === groupFilter).map(m => {
            const mp = pred[m.id] as MatchPrediction | undefined;
            return [m.id, mp?.outcome ?? null];
          })
        );
        return (
          <>
            <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
              Group {groupFilter} — {activePlayers[pi] || `Player ${pi + 1}`}'s predictions
            </div>
            {GROUP_MATCHES.filter(m => m.group === groupFilter).map(m => {
              const mp = pred[m.id] as MatchPrediction | undefined ?? {};
              const actual = results[m.id];
              const outcome = mp.outcome;
              return (
                <div key={m.id} className="match-row">
                  <span style={{ fontSize:10,color:"#444",minWidth:42,flexShrink:0 }}>{m.date}</span>
                  <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.home)} {m.home}</span>
                  <div style={{ display:"flex",gap:3,flexShrink:0 }}>
                    {(["H","D","A"] as const).map(val => {
                      const label = val === "H" ? "H" : val === "D" ? "U" : "B";
                      return (
                        <button key={val} className="hub-btn"
                          onClick={() => isEditable && setPred(pi, m.id, "outcome", outcome === val ? null : val)}
                          style={{
                            background: outcome === val ? "#f97316" : "#0d0d1a",
                            color:      outcome === val ? "#000" : "#555",
                            border:     `1.5px solid ${outcome === val ? "#f97316" : "#252535"}`,
                            cursor:     isEditable ? "pointer" : "default",
                            opacity:    isEditable ? 1 : 0.6,
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.away)} {m.away}</span>
                  {actual != null && <PointsBadge pts={pointsForOutcome(mp, actual)}/>}
                </div>
              );
            })}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>
                Predicted standings
                {isEditable && <span style={{ color:"#333",marginLeft:6,textTransform:"none",letterSpacing:0 }}>— ↑↓ swap tied teams</span>}
              </div>
              <GroupTableEditable
                group={groupFilter}
                teams={GROUPS[groupFilter]}
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
          {BONUS_QUESTIONS.map(bq => {
            const bonusPreds = (predictions[pi]?.bonus as Record<string, string> | undefined);
            const playerBonus = bonusPreds?.[bq.id] ?? "";
            const actual = results[`bonus_${bq.id}`] as string | undefined;
            const correct = actual && playerBonus && playerBonus.toLowerCase().trim() === actual.toLowerCase().trim();
            return (
              <div key={bq.id} style={{ marginBottom:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#ddd" }}>{bq.label}</span>
                  <span style={{ fontSize:10,background:"#f9731622",color:"#f97316",border:"1px solid #f9731640",borderRadius:4,padding:"1px 7px",fontWeight:700 }}>+{bq.pts} pts</span>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <input className="bonus-input" placeholder="Your answer…" value={playerBonus}
                    onChange={e => isEditable && setBonusPred(pi, bq.id, e.target.value)}
                    readOnly={!isEditable}
                    style={{ opacity: isEditable ? 1 : 0.6 }}
                  />
                  {actual && <PointsBadge pts={correct ? bq.pts : 0}/>}
                </div>
                {actual && <div style={{ fontSize:11,color:"#3b82f6",marginTop:3 }}>Actual: {actual}</div>}
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
