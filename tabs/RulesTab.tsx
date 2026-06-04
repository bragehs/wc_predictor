import { SCORING, BONUS_QUESTIONS, WinnerPoints } from "../config";
import { KNOCKOUT_ROUNDS_META } from "../bracketLogic";
import { THEME } from "../theme";
import STitle from "../components/STitle";

export default function RulesTab() {
  return (
    <div>
      <STitle>Rules</STitle>
      <div style={{ padding:14,background:THEME.bgCard,borderRadius:8,border:`1px solid ${THEME.borderCard}`,fontSize:13,color:THEME.textSecondary,lineHeight:2 }}>
        <div style={{ color:THEME.blue,fontWeight:700,marginBottom:4,fontSize:14 }}>Reglene</div>
        <div><b style={{color:THEME.textPrimary}}>+{SCORING.correctOutcome} pt</b> — riktig tips (H/U/B) per kamp</div>
        <div><b style={{color:THEME.textPrimary}}>+{SCORING.tablePosition} pt</b> — riktig tabellplassering per lag</div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:`1px solid ${THEME.borderMuted}` }}>
          {KNOCKOUT_ROUNDS_META.map(r => (
            <div key={r.id}><b style={{color:THEME.textPrimary}}>+{r.pts} pts</b> — {r.label}</div>
          ))}
          <div><b style={{color:THEME.textPrimary}}>+{WinnerPoints} pts</b> — {"Winner"}</div>
        </div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:`1px solid ${THEME.borderMuted}` }}>
          {BONUS_QUESTIONS.map(bq => (
            <div key={bq.id}><b style={{color:THEME.textPrimary}}>+{bq.pts} pts</b> — {bq.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
