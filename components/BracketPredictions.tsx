import type { AllPredictions, AllResults } from "../types/index";
import { GROUPS, flag } from "../data";
import { buildR32Bracket, getKnockoutMatchup, KNOCKOUT_ROUNDS_META } from "../bracketLogic";
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
  const pred       = predictions[pi] ?? {};
  const thirdPicks = (pred.thirdPlaces as string[] | undefined) ?? [];
  const koWinners  = (pred.knockoutWinners as Record<string, string | null> | undefined) ?? {};
  const actKoW     = results.knockoutWinners ?? {};

  const predQ = buildPredQualifiers(pi, predictions);
  const thirds = Object.entries(GROUPS).map(([g]) => ({
    group: g, team: predQ[g]?.third ?? `3rd ${g}`,
  }));
  const r32 = buildR32Bracket(predQ, thirdPicks.length === 8 ? thirdPicks : null);

  const toggleThird = (g: string) => {
    if (!isEditable) return;
    if (thirdPicks.includes(g)) {
      setThirdPlacesPred(pi, thirdPicks.filter(x => x !== g));
    } else if (thirdPicks.length < 8) {
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
          <div style={{ fontSize:13,fontWeight:700,color:"#ddd",letterSpacing:1 }}>Best 3rd-place teams — pick 8</div>
          <div style={{ fontSize:12,color:thirdPicks.length===8?"#10b981":"#f97316",fontWeight:700 }}>
            {thirdPicks.length}/8 selected
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5 }}>
          {thirds.map(({ group, team }) => {
            const sel  = thirdPicks.includes(group);
            const full = !sel && thirdPicks.length >= 8;
            return (
              <button key={group} onClick={() => toggleThird(group)} disabled={full || !isEditable}
                style={{ background:sel?"#f97316":"#12121c",border:`1px solid ${sel?"#f97316":"#252535"}`,borderRadius:6,padding:"6px 8px",cursor:(full||!isEditable)?"default":"pointer",opacity:(full||(!isEditable&&!sel))?0.4:1,textAlign:"left" }}>
                <div style={{ fontSize:9,color:sel?"#000":"#666",letterSpacing:1,textTransform:"uppercase" }}>Group {group}</div>
                <div style={{ fontSize:11,fontWeight:700,color:sel?"#000":"#ccc",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {flag(team)} {team}
                </div>
              </button>
            );
          })}
        </div>
        {thirdPicks.length !== 8 && (
          <div style={{ fontSize:11,color:"#555",marginTop:6 }}>
            Select exactly 8 groups to unlock bracket predictions below.
          </div>
        )}
      </div>

      {KNOCKOUT_ROUNDS_META.map(round => (
        <div key={round.id} style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#f97316",letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
            <div style={{ fontSize:10,background:"#f9731622",color:"#f97316",border:"1px solid #f9731640",borderRadius:4,padding:"1px 7px",fontWeight:700 }}>+{round.pts} pts</div>
          </div>
          {round.matchIds.map(mid => {
            const { home, away } = getKnockoutMatchup(mid, r32, koWinners);
            const winner  = koWinners[mid] ?? null;
            const actual  = (actKoW as Record<string, string | null>)[mid];
            const correct = actual && winner && winner === actual;
            const wrong   = actual && winner && winner !== actual;
            const bothKnown = !home.startsWith("W(") && home !== "TBD" && !away.startsWith("W(") && away !== "TBD";
            return (
              <div key={mid} style={{ marginBottom:5 }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:9,color:"#333",minWidth:34,fontWeight:700 }}>{mid}</span>
                  <button className="ko-team" onClick={() => bothKnown && pickKO(mid, home)}
                    style={{ background:winner===home?"#f97316":"#12121c",border:`1px solid ${winner===home?"#f97316":"#252535"}`,color:winner===home?"#000":"#aaa",cursor:(bothKnown&&isEditable)?"pointer":"default",opacity:!bothKnown?0.5:1 }}>
                    {flag(home)} {home}
                  </button>
                  <span style={{ color:"#333",fontSize:10,fontWeight:700,flexShrink:0 }}>vs</span>
                  <button className="ko-team" onClick={() => bothKnown && pickKO(mid, away)}
                    style={{ background:winner===away?"#f97316":"#12121c",border:`1px solid ${winner===away?"#f97316":"#252535"}`,color:winner===away?"#000":"#aaa",cursor:(bothKnown&&isEditable)?"pointer":"default",opacity:!bothKnown?0.5:1 }}>
                    {flag(away)} {away}
                  </button>
                  {actual && (
                    <span style={{ fontSize:10,fontWeight:700,color:correct?"#10b981":wrong?"#f43f5e":"#444",background:correct?"#10b98118":wrong?"#f43f5e18":"#ffffff08",borderRadius:3,padding:"1px 6px",flexShrink:0 }}>
                      {correct ? `+${round.pts}` : wrong ? "✗" : "?"}
                    </span>
                  )}
                </div>
                {!bothKnown && (
                  <div style={{ fontSize:9,color:"#333",paddingLeft:40,marginTop:1 }}>
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
