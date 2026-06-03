import { flag } from "../data";
import { THEME } from "../theme";

interface BracketMatchProps {
  t1: string;
  t2: string;
  label: string;
  winner?: string | null;
}

export default function BracketMatch({ t1, t2, label, winner }: BracketMatchProps) {
  const isTBD = (t: string) => !t || t.startsWith("W(") || t.endsWith("TBD") || (t.includes("1") && t.length <= 3);
  const col1 = winner ? (winner === t1 ? THEME.green : THEME.textMuted) : (isTBD(t1) ? THEME.textMuted : THEME.textPrimary);
  const col2 = winner ? (winner === t2 ? THEME.green : THEME.textMuted) : (isTBD(t2) ? THEME.textMuted : THEME.textPrimary);
  return (
    <div style={{ background:THEME.bgCard,border:`1px solid ${THEME.borderCard}`,borderRadius:7,overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",borderBottom:`1px solid ${THEME.borderMuted}` }}>
        <span style={{ fontSize:10,color:THEME.textFaint,padding:"0 6px",borderRight:`1px solid ${THEME.borderMuted}`,fontWeight:700,letterSpacing:0.5,whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ padding:"7px 9px",fontSize:13,fontWeight:600,color:col1,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t1)} {t1}</span>
      </div>
      <div style={{ display:"flex",alignItems:"center" }}>
        <span style={{ fontSize:10,color:THEME.bgCard,padding:"0 6px",borderRight:`1px solid ${THEME.borderMuted}`,fontWeight:700 }}>{label}</span>
        <span style={{ padding:"7px 9px",fontSize:13,fontWeight:600,color:col2,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t2)} {t2}</span>
      </div>
    </div>
  );
}
