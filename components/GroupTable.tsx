import type { AllResults } from "../types/index";
import { flag } from "../data";
import { calcGroupStandings } from "../bracketLogic";

interface GroupTableProps {
  group: string;
  teams: string[];
  results: AllResults;
  highlight?: boolean;
}

export default function GroupTable({ group, teams, results, highlight }: GroupTableProps) {
  if (!teams) return null;
  const s = calcGroupStandings(group, teams, results);
  return (
    <div style={{ background:"#0c0c18",borderRadius:8,overflow:"hidden",border:"1px solid #181828",fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"4px 10px",background:"#121220",color:"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center"}}>GD</div>
        <div style={{textAlign:"center",color:"#f97316"}}>Pts</div>
      </div>
      {s.map((row, i) => (
        <div key={row.team} style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"5px 10px",background:i%2===0?"#0c0c18":"#0a0a14",borderTop:"1px solid #121220" }}>
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            {highlight && i < 2 && <span style={{ width:3,height:12,borderRadius:1,background:i===0?"#f97316":"#3b82f6",display:"inline-block",flexShrink:0 }}/>}
            {highlight && i === 2 && <span style={{ width:3,height:12,borderRadius:1,background:"#555",display:"inline-block",flexShrink:0 }}/>}
            <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(row.team)} {row.team}</span>
          </div>
          <div style={{textAlign:"center",color:"#888"}}>{row.w}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.d}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.l}</div>
          <div style={{textAlign:"center",color:row.gd>0?"#10b981":row.gd<0?"#f43f5e":"#888"}}>{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
          <div style={{textAlign:"center",fontWeight:700,color:"#f97316",fontSize:14}}>{row.pts}</div>
        </div>
      ))}
    </div>
  );
}
