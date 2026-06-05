import type { AllResults } from "../types/index";
import { useFlag, useTournament } from "../context/TournamentContext";
import { THEME } from "../theme";
import { calcGroupStandings } from "../bracketLogic";

const TB_GROUP = "3RD";

interface Props {
  results: AllResults;
  setTiebreaker: (group: string, type: string, team: string, val: number | undefined) => void;
  isLocked: boolean;
}

export default function ThirdPlaceTiebreakerSection({ results, setTiebreaker, isLocked }: Props) {
  const flag = useFlag();
  const { groups } = useTournament();

  const tb = (results.tiebreakers as Record<string, { yellowCards?: Record<string, number>; fifaRankings?: Record<string, number> }> | undefined)?.[TB_GROUP] ?? {};

  const entries = Object.entries(groups).flatMap(([g, teams]) => {
    const s = calcGroupStandings(g, teams, results);
    const row = s[2];
    return row ? [{ group: g, team: row.team, pts: row.pts, gd: row.gd, gf: row.gf }] : [];
  }).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf ||
    ((tb.yellowCards?.[a.team] ?? 999) - (tb.yellowCards?.[b.team] ?? 999)) ||
    ((tb.fifaRankings?.[a.team] ?? 999) - (tb.fifaRankings?.[b.team] ?? 999))
  );

  if (entries.length === 0) return null;

  const inputStyle: React.CSSProperties = { width:"100%",background:THEME.bgInput,border:`1.5px solid ${THEME.borderInput}`,color:THEME.textPrimary,fontSize:12,textAlign:"center",padding:"3px 4px",borderRadius:5,outline:"none",fontFamily:"inherit" };

  return (
    <div style={{ marginTop:12,padding:10,background:THEME.bgCard,borderRadius:8,border:`1px solid ${THEME.borderCard}` }}>
      <div style={{ fontSize:10,color:THEME.textMuted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
        Best 3rd place — top 8 qualify
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"20px 1fr 36px 36px 36px 72px 72px",gap:"4px 6px",alignItems:"center" }}>
        <div/>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1 }}>Team</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>Pts</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>GD</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>GF</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>Conduct</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>FIFA rank</div>

        {entries.map(({ team, group, pts, gd, gf }, i) => {
          const qualifies = i < 8;
          const isCutoff = i === 8;
          return [
            isCutoff && (
              <div key="cutoff" style={{ gridColumn:"1 / -1",borderTop:`1px dashed ${THEME.borderCard}`,margin:"2px 0" }}/>
            ),
            <div key={team + "_rank"} style={{ fontSize:11,fontWeight:700,color: qualifies ? THEME.green : THEME.textFaint,textAlign:"center" }}>
              {qualifies ? i + 1 : ""}
            </div>,
            <div key={team} style={{ fontSize:12,fontWeight:600,color: qualifies ? THEME.textPrimary : THEME.textFaint }}>
              {flag(team)} {team} <span style={{ fontSize:10,color:THEME.textFaint }}>(Grp {group})</span>
            </div>,
            <div key={team + "_pts"} style={{ fontSize:12,textAlign:"center",fontWeight:700,color: qualifies ? THEME.textPrimary : THEME.textFaint }}>{pts}</div>,
            <div key={team + "_gd"} style={{ fontSize:12,textAlign:"center",color: qualifies ? THEME.textPrimary : THEME.textFaint }}>{gd >= 0 ? `+${gd}` : gd}</div>,
            <div key={team + "_gf"} style={{ fontSize:12,textAlign:"center",color: qualifies ? THEME.textPrimary : THEME.textFaint }}>{gf}</div>,
            <input key={team + "_cs"} type="number" min={0} style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
              value={tb.yellowCards?.[team] ?? ""}
              onChange={e => !isLocked && setTiebreaker(TB_GROUP, "yellowCards", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
              readOnly={isLocked}
              placeholder="—"/>,
            <input key={team + "_fr"} type="number" min={1} style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
              value={tb.fifaRankings?.[team] ?? ""}
              onChange={e => !isLocked && setTiebreaker(TB_GROUP, "fifaRankings", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
              readOnly={isLocked}
              placeholder="—"/>,
          ];
        })}
      </div>
    </div>
  );
}
