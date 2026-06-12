import type { AllPredictions, AllResults } from "../types/index";
import { useTournament, useFlag } from "../context/TournamentContext";
import { THEME } from "../theme";
import { buildFirstKOBracket, getKnockoutMatchup, getQualifiers, THIRD_PLACE_COUNT, QUALIFICATION_ROUND_ID, FINAL_MATCH_ID } from "../bracketLogic";
import { WinnerPoints } from "../config";
import { buildPredQualifiers } from "../helpers";

interface BracketPredictionsProps {
  pi: number;
  predictions: AllPredictions;
  results: AllResults;
  setThirdPlacesPred: (pi: number, groups: string[]) => void;
  setKnockoutWinnerPred: (pi: number, matchId: string, team: string | null) => void;
  isEditable: boolean;
}

const isPlaceholder = (t: string) => t === "TBD" || t.startsWith("W(") || t.startsWith("3rd");

export default function BracketPredictions({
  pi, predictions, results, setThirdPlacesPred, setKnockoutWinnerPred, isEditable,
}: BracketPredictionsProps) {
  const { groups, knockoutRounds } = useTournament();
  const flag = useFlag();
  const pred       = predictions[pi];
  const thirdPicks = pred?.thirdPlaces ?? [];
  const koWinners  = pred?.knockoutWinners ?? {};
  const actKoW     = results.knockoutWinners ?? {};

  const predQ = buildPredQualifiers(pi, predictions);
  const thirds = Object.entries(groups).map(([g]) => ({
    group: g,
    team: predQ[g]?.third ?? `3rd ${g}`,
    pts: predQ[g]?.row?.pts ?? 0,
  }));
  const firstKO = buildFirstKOBracket(predQ, thirdPicks.length === THIRD_PLACE_COUNT ? thirdPicks : null);
  const actualFirstKO = buildFirstKOBracket(
    getQualifiers(results),
    null,
    results.tiebreakers,
  );

  const toggleThird = (g: string) => {
    if (!isEditable) return;
    if (thirdPicks.includes(g)) {
      setThirdPlacesPred(pi, thirdPicks.filter(x => x !== g));
    } else if (thirdPicks.length < THIRD_PLACE_COUNT) {
      setThirdPlacesPred(pi, [...thirdPicks, g]);
    }
  };

  const pickKO = (matchId: string, team: string) => {
    if (!isEditable) return;
    setKnockoutWinnerPred(pi, matchId, koWinners[matchId] === team ? null : team);
  };

  function roundTeamCount(roundIdx: number): { correct: number; total: number; hasResults: boolean } {
    const round = knockoutRounds[roundIdx];
    const total = round.matchIds.length * 2;

    if (round.id === QUALIFICATION_ROUND_ID || roundIdx === 0) {
      // Teams entering R32 come from group qualifiers, not KO match winners
      const myTeams    = new Set(firstKO.flatMap(m => [m.home, m.away]).filter(t => !isPlaceholder(t)));
      const actualTeams = new Set(actualFirstKO.flatMap(m => [m.home, m.away]).filter(t => !isPlaceholder(t)));
      const correct = [...myTeams].filter(t => actualTeams.has(t)).length;
      return { correct, total, hasResults: actualTeams.size > 0 };
    }

    // Teams in round k are the winners of round k-1
    const prevMatchIds = knockoutRounds[roundIdx - 1].matchIds;
    const myTeams     = new Set(prevMatchIds.map(id => koWinners[id]).filter((t): t is string => !!t));
    const actualTeams = new Set(prevMatchIds.map(id => actKoW[id]).filter((t): t is string => !!t));
    const correct = [...myTeams].filter(t => actualTeams.has(t)).length;
    return { correct, total, hasResults: actualTeams.size > 0 };
  }

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <div style={{ fontSize:13,fontWeight:700,color:THEME.textPrimary,letterSpacing:1 }}>Best 3rd-place teams — pick 8</div>
          <div style={{ fontSize:12,color:thirdPicks.length===8?THEME.green:THEME.gold,fontWeight:700 }}>
            {thirdPicks.length}/8 selected
          </div>
        </div>
        <div style={{ background:THEME.bgCard,border:`1px solid ${THEME.borderCard}`,borderRadius:6,marginBottom:8,overflow:"hidden" }}>
          {[...thirds].sort((a,b) => b.pts - a.pts).map(({ group, team, pts }, i, arr) => {
            const sel = thirdPicks.includes(group);
            return (
              <div key={group} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 10px",background:sel?THEME.goldBg:"transparent",opacity:sel?1:0.45,borderBottom:i<arr.length-1?`1px solid ${THEME.borderCard}`:"none" }}>
                <span style={{ fontSize:11,color:THEME.textMuted,fontWeight:700,minWidth:18,letterSpacing:1 }}>{group}</span>
                <span style={{ flex:1,fontSize:13,fontWeight:700,color:sel?THEME.gold:THEME.textSecondary,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(team)} {team}</span>
                <span style={{ fontSize:12,fontWeight:700,color:sel?THEME.gold:THEME.textMuted,minWidth:40,textAlign:"right" }}>{pts} pts</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5 }}>
          {thirds.map(({ group, team }) => {
            const sel  = thirdPicks.includes(group);
            const full = !sel && thirdPicks.length >= 8;
            return (
              <button key={group} onClick={() => toggleThird(group)} disabled={full || !isEditable}
                style={{ background:sel?THEME.gold:THEME.bgButton,border:`1px solid ${sel?THEME.gold:THEME.borderCard}`,borderRadius:6,padding:"8px 10px",cursor:(full||!isEditable)?"default":"pointer",opacity:(full||(!isEditable&&!sel))?0.4:1,textAlign:"left" }}>
                <div style={{ fontSize:11,color:sel?"#000":THEME.textMuted,letterSpacing:1,textTransform:"uppercase" }}>Group {group}</div>
                <div style={{ fontSize:13,fontWeight:700,color:sel?"#000":THEME.textSecondary,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {flag(team)} {team}
                </div>
              </button>
            );
          })}
        </div>
        {thirdPicks.length !== 8 && (
          <div style={{ fontSize:13,color:THEME.textMuted,marginTop:6 }}>
            Select exactly 8 groups to unlock bracket predictions below.
          </div>
        )}
      </div>

      {knockoutRounds.map((round, roundIdx) => {
        const { correct, total, hasResults } = roundTeamCount(roundIdx);
        return (
          <div key={round.id} style={{ marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
              <div style={{ fontSize:13,fontWeight:700,color:THEME.gold,letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
              <div style={{ fontSize:12,background:THEME.goldBg,color:THEME.gold,border:`1px solid ${THEME.goldBorder}`,borderRadius:4,padding:"2px 8px",fontWeight:700 }}>+{round.pts} pts</div>
              {hasResults && (
                <div style={{ fontSize:12,fontWeight:700,color:correct===total?THEME.green:THEME.textMuted }}>
                  {correct}/{total}
                </div>
              )}
            </div>
            {round.matchIds.map(mid => {
              const { home, away } = getKnockoutMatchup(mid, firstKO, koWinners);
              const winner    = koWinners[mid] ?? null;
              const bothKnown = !isPlaceholder(home) && !isPlaceholder(away);
              return (
                <div key={mid} style={{ marginBottom:5 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                    <span style={{ fontSize:11,color:THEME.textFaint,minWidth:38,fontWeight:700 }}>{mid}</span>
                    <button className="ko-team" onClick={() => bothKnown && pickKO(mid, home)}
                      style={{ background:winner===home?THEME.gold:THEME.bgButton,border:`1px solid ${winner===home?THEME.gold:THEME.borderCard}`,color:winner===home?"#000":THEME.textSecondary,cursor:(bothKnown&&isEditable)?"pointer":"default",opacity:!bothKnown?0.5:1 }}>
                      {flag(home)} {home}
                    </button>
                    <span style={{ color:THEME.textFaint,fontSize:12,fontWeight:700,flexShrink:0 }}>vs</span>
                    <button className="ko-team" onClick={() => bothKnown && pickKO(mid, away)}
                      style={{ background:winner===away?THEME.gold:THEME.bgButton,border:`1px solid ${winner===away?THEME.gold:THEME.borderCard}`,color:winner===away?"#000":THEME.textSecondary,cursor:(bothKnown&&isEditable)?"pointer":"default",opacity:!bothKnown?0.5:1 }}>
                      {flag(away)} {away}
                    </button>
                  </div>
                  {!bothKnown && (
                    <div style={{ fontSize:11,color:THEME.textFaint,paddingLeft:44,marginTop:1 }}>
                      Predict prior rounds first
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {(() => {
        const predWinner   = koWinners[FINAL_MATCH_ID] ?? null;
        const actualWinner = actKoW[FINAL_MATCH_ID] ?? null;
        const isCorrect    = predWinner && actualWinner && predWinner === actualWinner;
        return (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
              <div style={{ fontSize:13,fontWeight:700,color:THEME.gold,letterSpacing:1,textTransform:"uppercase" }}>Tournament Winner</div>
              <div style={{ fontSize:12,background:THEME.goldBg,color:THEME.gold,border:`1px solid ${THEME.goldBorder}`,borderRadius:4,padding:"2px 8px",fontWeight:700 }}>+{WinnerPoints} pts</div>
              {actualWinner && predWinner && (
                <div style={{ fontSize:12,fontWeight:700,color:isCorrect?THEME.green:THEME.textMuted }}>{isCorrect?"1/1":"0/1"}</div>
              )}
            </div>
            {predWinner
              ? <div style={{ padding:"10px 14px",background:THEME.bgButton,border:`1px solid ${THEME.borderCard}`,borderRadius:8,fontSize:14,fontWeight:700,color:THEME.textPrimary }}>{flag(predWinner)} {predWinner}</div>
              : <div style={{ fontSize:12,color:THEME.textFaint }}>Predict the final to set your winner.</div>
            }
          </div>
        );
      })()}
    </div>
  );
}
