import { useTournament } from "../context/TournamentContext";
import { SCORING, WinnerPoints } from "../config";
import { THEME } from "../theme";
import STitle from "../components/STitle";

export default function RulesTab() {
  const { bonusQuestions, knockoutRounds } = useTournament();
  return (
    <div>
      <STitle>Rules</STitle>
      <div style={{ padding:14,background:THEME.bgCard,borderRadius:8,border:`1px solid ${THEME.borderCard}`,fontSize:13,color:THEME.textSecondary,lineHeight:2 }}>
        <div style={{ color:THEME.blue,fontWeight:700,marginBottom:4,fontSize:14 }}>Reglene</div>
        <div><b style={{color:THEME.textPrimary}}>+{SCORING.correctOutcome} poeng</b> — riktig tips (H/U/B) per kamp</div>
        <div><b style={{color:THEME.textPrimary}}>+{SCORING.tablePosition} poeng</b> — riktig tabellplassering per lag</div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:`1px solid ${THEME.borderMuted}` }}>
          <span>I sluttspillet får man poeng ut ifra hvor mange lag man har med seg ut i turneringen. Det er ikke relevant hvor i treet laget faktisk har endt, bare at de har nådd den gitte runden. </span>
          {knockoutRounds.map(r => (
            <div key={r.id}><b style={{color:THEME.textPrimary}}>+{r.pts} poeng per lag</b> — {r.label}</div>
          ))}
          <div><b style={{color:THEME.textPrimary}}>+{WinnerPoints} poeng</b> — {"Vinner"}</div>
        </div>
        <div style={{ marginTop:6,paddingTop:6,borderTop:`1px solid ${THEME.borderMuted}` }}>
          {bonusQuestions.map(bq => (
            <div key={bq.id}><b style={{color:THEME.textPrimary}}>+{bq.pts} poeng</b> — {bq.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
