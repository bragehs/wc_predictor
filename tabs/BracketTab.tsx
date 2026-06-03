import type { AllPredictions, AllResults, BracketView } from "../types/index";
import { COLORS } from "../config";
import { THEME } from "../theme";
import {
  getQualifiers, buildR32Bracket, getKnockoutMatchup,
  getBestThirdPlaces, KNOCKOUT_ROUNDS_META,
} from "../bracketLogic";
import { flag } from "../data";
import { buildPredQualifiers } from "../helpers";
import STitle from "../components/STitle";
import BracketMatch from "../components/BracketMatch";

interface BracketTabProps {
  activePlayers: string[];
  predictions: AllPredictions;
  results: AllResults;
  bracketView: BracketView;
  setBracketView: (view: BracketView) => void;
}

export default function BracketTab({
  activePlayers, predictions, results, bracketView, setBracketView,
}: BracketTabProps) {
  const isActual   = bracketView === "actual";
  const koWinners  = isActual
    ? (results.knockoutWinners ?? {}) as Record<string, string | null>
    : (predictions[bracketView as number]?.knockoutWinners as Record<string, string | null> | undefined) ?? {};
  const qualifiers = isActual
    ? getQualifiers(results)
    : buildPredQualifiers(bracketView as number, predictions);
  const thirdPicks = isActual
    ? null
    : (predictions[bracketView as number]?.thirdPlaces as string[] | undefined) ?? null;
  const r32   = buildR32Bracket(qualifiers, thirdPicks?.length === 8 ? thirdPicks : null);
  const best8 = getBestThirdPlaces(qualifiers);

  return (
    <div>
      <STitle>Knockout Bracket</STitle>
      <div className="hscroll" style={{ marginBottom:14 }}>
        <button className="grp-btn" onClick={() => setBracketView("actual")}
          style={{ background:isActual?THEME.blue:THEME.bgButton,color:isActual?"#fff":THEME.textSecondary,border:`1px solid ${isActual?THEME.blue:THEME.borderCard}`,flexShrink:0 }}>
          Actual
        </button>
        {activePlayers.map((p, i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setBracketView(i)}
            style={{ background:bracketView===i?COLORS[i]:THEME.bgButton,color:bracketView===i?"#000":THEME.textSecondary,border:`1px solid ${bracketView===i?COLORS[i]:THEME.borderCard}`,flexShrink:0 }}>
            {p}
          </button>
        ) : null)}
      </div>

      {isActual && best8.length > 0 && (
        <div style={{ marginBottom:12,padding:10,background:THEME.bgCard,borderRadius:8,border:`1px solid ${THEME.borderCard}` }}>
          <div style={{ fontSize:12,color:THEME.textMuted,letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Best 3rd-place qualifiers</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
            {best8.map(t => (
              <span key={t.group} style={{ fontSize:13,background:THEME.bgButton,border:`1px solid ${THEME.borderCard}`,borderRadius:4,padding:"3px 9px",color:THEME.textSecondary }}>
                <span style={{ color:THEME.gold,fontWeight:700 }}>Grp {t.group}</span> {flag(t.team)} {t.team}
              </span>
            ))}
          </div>
        </div>
      )}

      {KNOCKOUT_ROUNDS_META.map(round => (
        <div key={round.id} style={{ marginBottom:16 }}>
          <div style={{ fontSize:12,color:THEME.textMuted,letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>{round.label}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
            {round.matchIds.map(mid => {
              const { home, away } = getKnockoutMatchup(mid, r32, koWinners);
              const winner = koWinners[mid];
              return <BracketMatch key={mid} label={mid} t1={home} t2={away} winner={winner}/>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
