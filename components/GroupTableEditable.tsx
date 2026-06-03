import { flag } from "../data";
import { calcGroupStandingsFromOutcomes } from "../bracketLogic";
import { applyManualOrder } from "../helpers";

interface GroupTableEditableProps {
  group: string;
  teams: string[];
  outcomes: Record<string, string | null>;
  storedOrder?: string[];
  onOrderChange: (order: string[]) => void;
  isEditable: boolean;
}

export default function GroupTableEditable({
  group, teams, outcomes, storedOrder, onOrderChange, isEditable,
}: GroupTableEditableProps) {
  const standings = calcGroupStandingsFromOutcomes(group, teams, outcomes);
  const effective = applyManualOrder(standings, storedOrder);

  const swap = (i: number, j: number) => {
    if (!isEditable) return;
    const newOrder = effective.map(r => r.team);
    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    onOrderChange(newOrder);
  };

  return (
    <div style={{ background:"#0c0c18",borderRadius:8,overflow:"hidden",border:"1px solid #181828",fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"4px 10px",background:"#121220",color:"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>#</div><div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center",color:"#f97316"}}>Pts</div>
        <div style={{textAlign:"center"}}>↑↓</div>
      </div>
      {effective.map((row, i) => {
        const canUp   = isEditable && i > 0 && effective[i - 1].pts === row.pts;
        const canDown = isEditable && i < effective.length - 1 && effective[i + 1].pts === row.pts;
        const barColor = i === 0 ? "#f97316" : i === 1 ? "#3b82f6" : i === 2 ? "#555" : "transparent";
        return (
          <div key={row.team} style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"5px 10px",background:i%2===0?"#0c0c18":"#0a0a14",borderTop:"1px solid #121220",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:3 }}>
              <span style={{ width:3,height:12,borderRadius:1,background:barColor,flexShrink:0,display:"inline-block" }}/>
              <span style={{ color:"#555",fontSize:10 }}>{i + 1}</span>
            </div>
            <div style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(row.team)} {row.team}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.w}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.d}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.l}</div>
            <div style={{textAlign:"center",fontWeight:700,color:"#f97316",fontSize:14}}>{row.pts}</div>
            <div style={{ display:"flex",justifyContent:"center",gap:1 }}>
              <button className="sort-btn" onClick={() => canUp && swap(i, i - 1)} disabled={!canUp}>↑</button>
              <button className="sort-btn" onClick={() => canDown && swap(i, i + 1)} disabled={!canDown}>↓</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
