import type { AllResults } from "../types/index";
import { GROUPS, GROUP_MATCHES, flag } from "../data";
import { BONUS_QUESTIONS } from "../config";
import { THEME } from "../theme";
import {
  getQualifiers, buildR32Bracket, getKnockoutMatchup, KNOCKOUT_ROUNDS_META,
} from "../bracketLogic";
import STitle from "../components/STitle";
import GroupTable from "../components/GroupTable";
import TiebreakerSection from "../components/TiebreakerSection";

interface ResultsTabProps {
  groupFilter: string;
  setGroupFilter: (g: string) => void;
  results: AllResults;
  setResult: (matchId: string, side: string, val: string) => void;
  setBonusResult: (qid: string, val: string) => void;
  setKnockoutWinnerResult: (matchId: string, team: string | null) => void;
  setTiebreaker: (group: string, type: string, team: string, val: number | undefined) => void;
  isLocked: boolean;
}

export default function ResultsTab({
  groupFilter, setGroupFilter,
  results, setResult, setBonusResult, setKnockoutWinnerResult, setTiebreaker,
  isLocked,
}: ResultsTabProps) {
  const actualQ   = getQualifiers(results);
  const actualR32 = buildR32Bracket(actualQ);
  const koWinners = (results.knockoutWinners ?? {}) as Record<string, string | null>;

  return (
    <div>
      <STitle>Enter Real Results</STitle>
      {isLocked && (
        <div style={{ background:THEME.bgCard,border:`1px solid ${THEME.blueBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:THEME.blue,fontFamily:"'Barlow',Arial" }}>
          🔒 Results are currently locked. Contact the organizer to make changes.
        </div>
      )}
      {!isLocked && <div style={{ fontSize:12,color:THEME.textMuted,marginBottom:12 }}>Enter actual scores and knockout results as the tournament progresses.</div>}

      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>
        {Object.keys(GROUPS).map(g => (
          <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
            style={{ background:groupFilter===g?THEME.blue:THEME.bgButton,color:groupFilter===g?"#fff":THEME.textSecondary,border:`1px solid ${groupFilter===g?THEME.blue:THEME.borderCard}` }}>
            {g}
          </button>
        ))}
        <button className="grp-btn" onClick={() => setGroupFilter("BONUS")}
          style={{ background:groupFilter==="BONUS"?THEME.purple:THEME.bgButton,color:groupFilter==="BONUS"?"#fff":THEME.textSecondary,border:`1px solid ${groupFilter==="BONUS"?THEME.purple:THEME.borderCard}` }}>
          Bonus
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("KNOCKOUT")}
          style={{ background:groupFilter==="KNOCKOUT"?THEME.green:THEME.bgButton,color:groupFilter==="KNOCKOUT"?"#000":THEME.textSecondary,border:`1px solid ${groupFilter==="KNOCKOUT"?THEME.green:THEME.borderCard}` }}>
          Knockout
        </button>
      </div>

      {!["BONUS", "KNOCKOUT", "BRACKET"].includes(groupFilter) && (
        <>
          {GROUP_MATCHES.filter(m => m.group === groupFilter).map(m => {
            const actual = results[m.id] as { home?: string; away?: string } | undefined ?? {};
            return (
              <div key={m.id} className="match-row">
                <span style={{ fontSize:10,color:THEME.textFaint,minWidth:42,flexShrink:0 }}>{m.date}</span>
                <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap",color:THEME.textPrimary }}>{flag(m.home)} {m.home}</span>
                <div style={{ display:"flex",alignItems:"center",gap:4,flexShrink:0 }}>
                  <input className="score-input actual" type="number" min={0} max={99}
                    value={actual.home ?? ""}
                    onChange={e => !isLocked && setResult(m.id, "home", e.target.value)}
                    readOnly={isLocked}
                    style={{ opacity: isLocked ? 0.5 : 1 }}
                    placeholder="0"/>
                  <span style={{ color:THEME.textFaint,fontSize:11 }}>–</span>
                  <input className="score-input actual" type="number" min={0} max={99}
                    value={actual.away ?? ""}
                    onChange={e => !isLocked && setResult(m.id, "away", e.target.value)}
                    readOnly={isLocked}
                    style={{ opacity: isLocked ? 0.5 : 1 }}
                    placeholder="0"/>
                </div>
                <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap",color:THEME.textPrimary }}>{flag(m.away)} {m.away}</span>
              </div>
            );
          })}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:10,color:THEME.textFaint,letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Group {groupFilter} Standings</div>
            <GroupTable group={groupFilter} teams={GROUPS[groupFilter]} results={results} highlight/>
          </div>
          <TiebreakerSection group={groupFilter} results={results} setTiebreaker={setTiebreaker} isLocked={isLocked}/>
        </>
      )}

      {groupFilter === "BONUS" && (
        <div>
          <div style={{ fontSize:10,color:THEME.textFaint,letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>Bonus — enter actual answers</div>
          {BONUS_QUESTIONS.map(bq => (
            <div key={bq.id} style={{ marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                <span style={{ fontSize:13,fontWeight:600,color:THEME.textPrimary }}>{bq.label}</span>
                <span style={{ fontSize:10,background:THEME.blueBg,color:THEME.blue,border:`1px solid ${THEME.blueBorder}`,borderRadius:4,padding:"1px 7px" }}>+{bq.pts} pts</span>
              </div>
              <input className="bonus-input actual" placeholder="Actual answer…"
                value={(results[`bonus_${bq.id}`] as string | undefined) ?? ""}
                onChange={e => !isLocked && setBonusResult(bq.id, e.target.value)}
                readOnly={isLocked}
                style={{ opacity: isLocked ? 0.5 : 1 }}/>
            </div>
          ))}
        </div>
      )}

      {groupFilter === "KNOCKOUT" && (
        <div>
          {KNOCKOUT_ROUNDS_META.map(round => (
            <div key={round.id} style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <div style={{ fontSize:13,fontWeight:700,color:THEME.blue,letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
                <div style={{ fontSize:10,background:THEME.blueBg,color:THEME.blue,border:`1px solid ${THEME.blueBorder}`,borderRadius:4,padding:"1px 7px" }}>+{round.pts} pts</div>
              </div>
              {round.matchIds.map(mid => {
                const { home, away } = getKnockoutMatchup(mid, actualR32, koWinners);
                const winner = koWinners[mid] ?? null;
                const bothKnown = !home.startsWith("W(") && home !== "TBD" && !away.startsWith("W(") && away !== "TBD";
                return (
                  <div key={mid} style={{ display:"flex",alignItems:"center",gap:5,marginBottom:5 }}>
                    <span style={{ fontSize:9,color:THEME.textFaint,minWidth:34,fontWeight:700 }}>{mid}</span>
                    <button className="ko-team"
                      onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === home ? null : home)}
                      style={{ background:winner===home?THEME.blue:THEME.bgButton,border:`1px solid ${winner===home?THEME.blue:THEME.borderCard}`,color:winner===home?"#fff":THEME.textSecondary,cursor:(bothKnown&&!isLocked)?"pointer":"default",opacity:(!bothKnown||isLocked)?0.4:1 }}>
                      {flag(home)} {home}
                    </button>
                    <span style={{ color:THEME.textFaint,fontSize:10,fontWeight:700,flexShrink:0 }}>vs</span>
                    <button className="ko-team"
                      onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === away ? null : away)}
                      style={{ background:winner===away?THEME.blue:THEME.bgButton,border:`1px solid ${winner===away?THEME.blue:THEME.borderCard}`,color:winner===away?"#fff":THEME.textSecondary,cursor:(bothKnown&&!isLocked)?"pointer":"default",opacity:(!bothKnown||isLocked)?0.4:1 }}>
                      {flag(away)} {away}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
