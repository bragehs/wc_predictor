import type { AllResults } from "../types/index";
import { useFlag } from "../context/TournamentContext";
import { calcGroupStandings } from "../bracketLogic";
import { THEME } from "../theme";

interface GroupTableProps {
  group: string;
  teams: string[];
  results: AllResults;
  highlight?: boolean;
}

export default function GroupTable({ group, teams, results, highlight }: GroupTableProps) {
  const flag = useFlag();
  if (!teams) return null;
  const s = calcGroupStandings(group, teams, results);
  return (
    <div style={{ background:THEME.bgCard,borderRadius:8,overflow:"hidden",border:`1px solid ${THEME.borderCard}`,fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"4px 10px",background:THEME.bgInset,color:THEME.textMuted,fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center"}}>GD</div>
        <div style={{textAlign:"center",color:THEME.gold}}>Pts</div>
      </div>
      {s.map((row, i) => (
        <div key={row.team} style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"5px 10px",background:i%2===0?THEME.bgRow:THEME.bgRowAlt,borderTop:`1px solid ${THEME.borderFaint}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            {highlight && i < 2 && <span style={{ width:3,height:12,borderRadius:1,background:i===0?THEME.gold:THEME.blue,display:"inline-block",flexShrink:0 }}/>}
            {highlight && i === 2 && <span style={{ width:3,height:12,borderRadius:1,background:THEME.textMuted,display:"inline-block",flexShrink:0 }}/>}
            <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:THEME.textPrimary }}>{flag(row.team)} {row.team}</span>
          </div>
          <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.w}</div>
          <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.d}</div>
          <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.l}</div>
          <div style={{textAlign:"center",color:row.gd>0?THEME.green:row.gd<0?THEME.red:THEME.textSecondary}}>{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
          <div style={{textAlign:"center",fontWeight:700,color:THEME.gold,fontSize:14}}>{row.pts}</div>
        </div>
      ))}
    </div>
  );
}
