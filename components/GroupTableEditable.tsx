import { flag } from "../data";
import { calcGroupStandingsFromOutcomes } from "../bracketLogic";
import { applyManualOrder } from "../helpers";
import { THEME } from "../theme";

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
    <div style={{ background:THEME.bgCard,borderRadius:8,overflow:"hidden",border:`1px solid ${THEME.borderCard}`,fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"4px 10px",background:THEME.bgInset,color:THEME.textMuted,fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>#</div><div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center",color:THEME.gold}}>Pts</div>
        <div style={{textAlign:"center"}}>↑↓</div>
      </div>
      {effective.map((row, i) => {
        const canUp   = isEditable && i > 0 && effective[i - 1].pts === row.pts;
        const canDown = isEditable && i < effective.length - 1 && effective[i + 1].pts === row.pts;
        const barColor = i === 0 ? THEME.gold : i === 1 ? THEME.blue : i === 2 ? THEME.textMuted : "transparent";
        return (
          <div key={row.team} style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"5px 10px",background:i%2===0?THEME.bgRow:THEME.bgRowAlt,borderTop:`1px solid ${THEME.borderFaint}`,alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:3 }}>
              <span style={{ width:3,height:12,borderRadius:1,background:barColor,flexShrink:0,display:"inline-block" }}/>
              <span style={{ color:THEME.textMuted,fontSize:10 }}>{i + 1}</span>
            </div>
            <div style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:THEME.textPrimary }}>{flag(row.team)} {row.team}</div>
            <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.w}</div>
            <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.d}</div>
            <div style={{textAlign:"center",color:THEME.textSecondary}}>{row.l}</div>
            <div style={{textAlign:"center",fontWeight:700,color:THEME.gold,fontSize:14}}>{row.pts}</div>
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
