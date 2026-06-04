import type { AllResults } from "../types/index";
import { useFlag, useTournament } from "../context/TournamentContext";
import { THEME } from "../theme";
import { calcGroupStandings } from "../bracketLogic";

interface TiebreakerSectionProps {
  group: string;
  results: AllResults;
  setTiebreaker: (group: string, type: string, team: string, val: number | undefined) => void;
  isLocked: boolean;
}

function findTiedTeams(group: string, results: AllResults, groups: Record<string, string[]>): string[] {
  const teams = groups[group];
  if (!teams) return [];
  const s = calcGroupStandings(group, teams, results);
  const tied = new Set<string>();
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (s[i].pts === s[j].pts && s[i].gd === s[j].gd && s[i].gf === s[j].gf) {
        tied.add(s[i].team);
        tied.add(s[j].team);
      }
    }
  }
  return [...tied];
}

export default function TiebreakerSection({ group, results, setTiebreaker, isLocked }: TiebreakerSectionProps) {
  const flag = useFlag();
  const { groups } = useTournament();
  const tiedTeams = findTiedTeams(group, results, groups);
  if (tiedTeams.length === 0) return null;
  const tb = (results.tiebreakers as Record<string, { yellowCards?: Record<string, number>; fifaRankings?: Record<string, number> }> | undefined)?.[group] ?? {};
  const inputStyle: React.CSSProperties = { width:"100%",background:THEME.bgInput,border:`1.5px solid ${THEME.borderInput}`,color:THEME.textPrimary,fontSize:13,textAlign:"center",padding:"4px 6px",borderRadius:5,outline:"none",fontFamily:"inherit" };
  return (
    <div style={{ marginTop:12,padding:10,background:THEME.bgCard,borderRadius:8,border:`1px solid ${THEME.borderCard}` }}>
      <div style={{ fontSize:10,color:THEME.textMuted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
        Tiebreakers — tied teams in Group {group}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 80px",gap:6,alignItems:"center" }}>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1 }}>Team</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>Yellow</div>
        <div style={{ fontSize:9,color:THEME.textFaint,textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>FIFA rank</div>
        {tiedTeams.flatMap(team => [
          <div key={team} style={{ fontSize:12,fontWeight:600,color:THEME.textPrimary }}>{flag(team)} {team}</div>,
          <input key={team + "_yc"} type="number" min={0} style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
            value={tb.yellowCards?.[team] ?? ""}
            onChange={e => !isLocked && setTiebreaker(group, "yellowCards", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
            readOnly={isLocked}
            placeholder="—"/>,
          <input key={team + "_fr"} type="number" min={1} style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
            value={tb.fifaRankings?.[team] ?? ""}
            onChange={e => !isLocked && setTiebreaker(group, "fifaRankings", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
            readOnly={isLocked}
            placeholder="—"/>,
        ])}
      </div>
    </div>
  );
}
