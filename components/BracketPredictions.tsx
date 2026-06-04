import type { AllPredictions, AllResults } from "../types/index";
import { useTournament, useFlag } from "../context/TournamentContext";
import { THEME } from "../theme";
import { buildFirstKOBracket, getKnockoutMatchup, THIRD_PLACE_COUNT } from "../bracketLogic";
import { buildPredQualifiers } from "../helpers";

interface BracketPredictionsProps {
  pi: number;
  predictions: AllPredictions;
  results: AllResults;
  setThirdPlacesPred: (pi: number, groups: string[]) => void;
  setKnockoutWinnerPred: (pi: number, matchId: string, team: string | null) => void;
  isEditable: boolean;
}

export default function BracketPredictions({
  pi, predictions, results, setThirdPlacesPred, setKnockoutWinnerPred, isEditable,
}: BracketPredictionsProps) {
  const { groups, knockoutRounds } = useTournament();
  const flag = useFlag();
  const pred       = predictions[pi] ?? {};
  const thirdPicks = (pred.thirdPlaces as string[] | undefined) ?? [];
  const koWinners  = (pred.knockoutWinners as Record<string, string | null> | undefined) ?? {};
  const actKoW     = results.knockoutWinners ?? {};

  const predQ = buildPredQualifiers(pi, predictions);
  const thirds = Object.entries(groups).map(([g]) => ({
    group: g, team: predQ[g]?.third ?? `3rd ${g}`,
  }));
  const firstKO = buildFirstKOBracket(predQ, thirdPicks.length === THIRD_PLACE_COUNT ? thirdPicks : null);

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

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <div style={{ fontSize:13,fontWeight:700,color:THEME.textPrimary,letterSpacing:1 }}>Best 3rd-place teams — pick 8</div>
          <div style={{ fontSize:12,color:thirdPicks.length===8?THEME.green:THEME.gold,fontWeight:700 }}>
            {thirdPicks.length}/8 selected
          </div>
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

      {knockoutRounds.map(round => (
        <div key={round.id} style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <div style={{ fontSize:13,fontWeight:700,color:THEME.gold,letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
            <div style={{ fontSize:12,background:THEME.goldBg,color:THEME.gold,border:`1px solid ${THEME.goldBorder}`,borderRadius:4,padding:"2px 8px",fontWeight:700 }}>+{round.pts} pts</div>
          </div>
          {round.matchIds.map(mid => {
            const { home, away } = getKnockoutMatchup(mid, firstKO, koWinners);
            const winner  = koWinners[mid] ?? null;
            const actual  = (actKoW as Record<string, string | null>)[mid];
            const correct = actual && winner && winner === actual;
            const wrong   = actual && winner && winner !== actual;
            const bothKnown = !home.startsWith("W(") && home !== "TBD" && !away.startsWith("W(") && away !== "TBD";
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
                  {actual && (
                    <span style={{ fontSize:12,fontWeight:700,color:correct?THEME.green:wrong?THEME.red:THEME.textMuted,background:correct?THEME.greenBg:wrong?THEME.redBg:"#ffffff08",borderRadius:3,padding:"2px 7px",flexShrink:0 }}>
                      {correct ? `+${round.pts}` : wrong ? "✗" : "?"}
                    </span>
                  )}
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
      ))}
    </div>
  );
}
