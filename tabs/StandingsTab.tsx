import type { ScoreBreakdown } from "../types/index";
import { COLORS } from "../config";
import STitle from "../components/STitle";

interface StandingsTabProps {
  activePlayers: string[];
  scores: number[];
  calcScoreBreakdown: (pi: number) => ScoreBreakdown;
}

export default function StandingsTab({ activePlayers, scores, calcScoreBreakdown }: StandingsTabProps) {
  const rows = activePlayers
    .map((p, i) => ({ name: p, score: scores[i], idx: i, bd: calcScoreBreakdown(i) }))
    .filter(p => p.name)
    .sort((a, b) => b.score - a.score);

  const koTotal = (bd: ScoreBreakdown) => Object.values(bd.knockout).reduce((s, v) => s + v, 0);

  const th = (extra: React.CSSProperties): React.CSSProperties => ({
    padding:"9px 12px", fontWeight:600, fontSize:10, letterSpacing:1,
    textTransform:"uppercase", color:"#555", borderBottom:"1px solid #1c1c2c",
    background:"#121220", ...extra,
  });
  const td = (extra: React.CSSProperties): React.CSSProperties => ({
    padding:"10px 12px", borderTop:"1px solid #121220", fontSize:13, ...extra,
  });

  return (
    <div>
      <STitle>Leaderboard</STitle>
      {rows.length === 0 ? (
        <div style={{ color:"#555",fontSize:14 }}>No players configured yet.</div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead>
              <tr>
                <th style={th({ textAlign:"left",width:32 })}>#</th>
                <th style={th({ textAlign:"left" })}>Player</th>
                <th style={th({ textAlign:"right" })}>Outcomes</th>
                <th style={th({ textAlign:"right" })}>Table</th>
                <th style={th({ textAlign:"right" })}>KO</th>
                <th style={th({ textAlign:"right" })}>Bonus</th>
                <th style={th({ textAlign:"right", color:"#f97316" })}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, rank) => {
                const ko = koTotal(p.bd);
                return (
                  <tr key={p.idx} style={{ background: rank % 2 === 0 ? "#0c0c18" : "#0a0a14" }}>
                    <td style={td({ color:"#555",fontSize:11 })}>{rank + 1}</td>
                    <td style={td({})}>
                      <span style={{ color:COLORS[p.idx],fontWeight:700 }}>{p.name}</span>
                    </td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.outcomes}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.table}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{ko}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.bonus}</td>
                    <td style={td({ textAlign:"right",fontWeight:900,fontSize:17,color:"#f97316" })}>{p.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
