import { SCORING, BONUS_QUESTIONS } from "../config";
import { KNOCKOUT_ROUNDS_META } from "../bracketLogic";
import STitle from "../components/STitle";

export default function RulesTab() {
  return (
    <div>
      <STitle>Rules</STitle>
      <div style={{ padding:14,background:"#0d0d18",borderRadius:8,border:"1px solid #1c1c2c",fontSize:13,color:"#999",lineHeight:2 }}>
        <div style={{ color:"#3b82f6",fontWeight:700,marginBottom:4,fontSize:14 }}>Reglene</div>
        <div><b style={{color:"#fff"}}>+{SCORING.correctOutcome} pt</b> — riktig tips (H/U/B) per kamp</div>
        <div><b style={{color:"#fff"}}>+{SCORING.tablePosition} pt</b> — riktig tabellplassering per lag</div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #1c1c2c" }}>
          {KNOCKOUT_ROUNDS_META.map(r => (
            <div key={r.id}><b style={{color:"#fff"}}>+{r.pts} pts</b> — {r.label}</div>
          ))}
        </div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #1c1c2c" }}>
          {BONUS_QUESTIONS.map(bq => (
            <div key={bq.id}><b style={{color:"#fff"}}>+{bq.pts} pts</b> — {bq.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
