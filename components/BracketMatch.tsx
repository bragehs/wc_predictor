import { flag } from "../data";

interface BracketMatchProps {
  t1: string;
  t2: string;
  label: string;
  winner?: string | null;
}

export default function BracketMatch({ t1, t2, label, winner }: BracketMatchProps) {
  const isTBD = (t: string) => !t || t.startsWith("W(") || t.endsWith("TBD") || (t.includes("1") && t.length <= 3);
  const col1 = winner ? (winner === t1 ? "#10b981" : "#444") : (isTBD(t1) ? "#444" : "#f0f0f0");
  const col2 = winner ? (winner === t2 ? "#10b981" : "#444") : (isTBD(t2) ? "#444" : "#f0f0f0");
  return (
    <div style={{ background:"#0f0f1a",border:"1px solid #1c1c2c",borderRadius:6,overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",borderBottom:"1px solid #1c1c2c" }}>
        <span style={{ fontSize:8,color:"#333",padding:"0 5px",borderRight:"1px solid #1c1c2c",fontWeight:700,letterSpacing:0.5,whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ padding:"5px 7px",fontSize:11,fontWeight:600,color:col1,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t1)} {t1}</span>
      </div>
      <div style={{ display:"flex",alignItems:"center" }}>
        <span style={{ fontSize:8,color:"#0f0f1a",padding:"0 5px",borderRight:"1px solid #1c1c2c",fontWeight:700 }}>{label}</span>
        <span style={{ padding:"5px 7px",fontSize:11,fontWeight:600,color:col2,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t2)} {t2}</span>
      </div>
    </div>
  );
}
