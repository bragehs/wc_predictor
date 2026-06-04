import { useState, useEffect, useMemo, useRef } from "react";
import type { MatchPrediction, TabName, AllPredictions, AllResults, MatchOutcome, BracketView, ScoreBreakdown } from "./types/index.ts";
import { SCORING, BONUS_QUESTIONS, MAX_PLAYERS, COLORS, TABS, WinnerPoints } from "./config.ts";
import { THEME } from "./theme.ts";
import { GROUPS, GROUP_MATCHES } from "./data.js";
import { calcGroupStandings, getQualifiers, buildR32Bracket, KNOCKOUT_ROUNDS_META } from "./bracketLogic.ts";
import {
  groupIsComplete, playerGroupIsComplete, pointsForOutcome,
  getPredEffectiveOrder, buildPredR32,
} from "./helpers.ts";
import {
  loadAllData, loadResults,
  saveMatchPrediction, saveTablePrediction, saveBonusAnswer,
  saveThirdPlacePicks, saveKnockoutPrediction,
  saveMatchScore, saveKnockoutWinner, saveTiebreaker, saveBonusIsCorrect,
} from "./db.ts";
import RulesTab       from "./tabs/RulesTab.tsx";
import PredictionsTab from "./tabs/PredictionsTab.tsx";
import ResultsTab     from "./tabs/ResultsTab.tsx";
import BracketTab     from "./tabs/BracketTab.tsx";
import StandingsTab   from "./tabs/StandingsTab.tsx";

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: T) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export default function App() {
  const [tab, setTab]                   = useState<TabName>("Predictions");
  const [players, setPlayers]           = useState<string[]>(Array(MAX_PLAYERS).fill(""));
  const [numPlayers, setNumPlayers]     = useState(0);
  const [predictions, setPredictions]   = useState<AllPredictions>({});
  const [results, setResults]           = useState<AllResults>({});
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [groupFilter, setGroupFilter]   = useState("A");
  const [bracketView, setBracketView]   = useState<BracketView>("actual");
  const [loaded, setLoaded]             = useState(false);
  const [lockDate, setLockDate]         = useState<Date | null>(null);
  const [resultsLocked, setResultsLocked] = useState(false);

  const isAdmin = useMemo(() => new URLSearchParams(window.location.search).get("admin") === "1", []);
  const isLocked = !!(lockDate && new Date() > lockDate && !isAdmin);
  const isResultsLocked = resultsLocked && !isAdmin;

  // ── Per-field debounced savers ─────────────────────────────────────────────
  const matchPredSavers   = useRef({} as Record<string, (outcome: string | null) => void>);
  const tablePredSavers   = useRef({} as Record<string, (teams: string[]) => void>);
  const bonusSavers       = useRef({} as Record<string, (answer: string) => void>);
  const thirdPlacesSavers = useRef({} as Record<string, (groups: string[]) => void>);
  const koPredSavers      = useRef({} as Record<string, (winner: string | null) => void>);
  const matchScoreSavers  = useRef({} as Record<string, (val: string) => void>);
  const koWinnerSavers    = useRef({} as Record<string, (winner: string | null) => void>);
  const tiebreakerSaver   = useMemo(() => debounce(
    (g: string, t: string, team: string, val: number | undefined) =>
      saveTiebreaker(g, t, team, val).catch(console.error),
    1000
  ), []);

  function getMatchPredSaver(playerName: string, matchId: string) {
    const key = `${playerName}::${matchId}`;
    if (!matchPredSavers.current[key])
      matchPredSavers.current[key] = debounce(
        (outcome: string | null) => saveMatchPrediction(playerName, matchId, outcome).catch(console.error), 1200
      );
    return matchPredSavers.current[key];
  }
  function getTablePredSaver(playerName: string, groupId: string) {
    const key = `${playerName}::${groupId}`;
    if (!tablePredSavers.current[key])
      tablePredSavers.current[key] = debounce(
        (teams: string[]) => saveTablePrediction(playerName, groupId, teams).catch(console.error), 1200
      );
    return tablePredSavers.current[key];
  }
  function getBonusSaver(playerName: string, qid: string) {
    const key = `${playerName}::${qid}`;
    if (!bonusSavers.current[key])
      bonusSavers.current[key] = debounce(
        (answer: string) => saveBonusAnswer(playerName, qid, answer).catch(console.error), 1200
      );
    return bonusSavers.current[key];
  }
  function getThirdPlacesSaver(playerName: string) {
    if (!thirdPlacesSavers.current[playerName])
      thirdPlacesSavers.current[playerName] = debounce(
        (groups: string[]) => saveThirdPlacePicks(playerName, groups).catch(console.error), 1200
      );
    return thirdPlacesSavers.current[playerName];
  }
  function getKOPredSaver(playerName: string, matchId: string) {
    const key = `${playerName}::${matchId}`;
    if (!koPredSavers.current[key])
      koPredSavers.current[key] = debounce(
        (winner: string | null) => saveKnockoutPrediction(playerName, matchId, winner).catch(console.error), 1200
      );
    return koPredSavers.current[key];
  }
  function getMatchScoreSaver(matchId: string, side: "home" | "away") {
    const key = `${matchId}::${side}`;
    if (!matchScoreSavers.current[key])
      matchScoreSavers.current[key] = debounce(
        (val: string) => saveMatchScore(matchId, side, val).catch(console.error), 1000
      );
    return matchScoreSavers.current[key];
  }
  function getKOWinnerSaver(matchId: string) {
    if (!koWinnerSavers.current[matchId])
      koWinnerSavers.current[matchId] = debounce(
        (winner: string | null) => saveKnockoutWinner(matchId, winner).catch(console.error), 500
      );
    return koWinnerSavers.current[matchId];
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAllData().then(data => {
      setPlayers([...data.players, ...Array(MAX_PLAYERS - data.players.length).fill("")]);
      setNumPlayers(data.players.length);
      if (data.lockDate) setLockDate(data.lockDate);
      if (data.resultsLocked) setResultsLocked(true);
      setResults(data.results);
      setPredictions(data.predictions);
      setLoaded(true);
    }).catch(e => {
      console.error("Supabase load error:", e);
      setLoaded(true);
    });
  }, []);

  // ── Poll results every 60s ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const refresh = async () => {
      try { setResults(await loadResults()); } catch(_e) {}
    };
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [loaded]);

  const activePlayers = players.slice(0, numPlayers);

  // ── Prediction setters ─────────────────────────────────────────────────────
  function setPred(pi: number, matchId: string, side: string, val: MatchOutcome | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevMatch = prevPlayer[matchId] as MatchPrediction | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, [matchId]: { ...prevMatch, [side]: val } } };
      if (side === "outcome") getMatchPredSaver(players[pi], matchId)(val);
      return next;
    });
  }

  function setTableOrder(pi: number, group: string, order: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevOrder = prevPlayer.tableOrder as Record<string, string[]> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, tableOrder: { ...prevOrder, [group]: order } } };
      getTablePredSaver(players[pi], group)(order);
      return next;
    });
  }

  function setBonusPred(pi: number, qid: string, val: string) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevBonus = prevPlayer.bonus as Record<string, string> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, bonus: { ...prevBonus, [qid]: val } } };
      getBonusSaver(players[pi], qid)(val);
      return next;
    });
  }

  function setThirdPlacesPred(pi: number, groups: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const next: AllPredictions = { ...prev, [pi]: { ...prev[pi], thirdPlaces: groups } };
      getThirdPlacesSaver(players[pi])(groups);
      return next;
    });
  }

  function setKnockoutWinnerPred(pi: number, matchId: string, team: string | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevKO = prevPlayer.knockoutWinners as Record<string, string | null> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, knockoutWinners: { ...prevKO, [matchId]: team } } };
      getKOPredSaver(players[pi], matchId)(team);
      return next;
    });
  }

  // ── Result setters ─────────────────────────────────────────────────────────
  function setResult(matchId: string, side: string, val: string) {
    setResults(prev => {
      const prevMatch = prev[matchId] as { home?: string; away?: string } | undefined ?? {};
      const next: AllResults = { ...prev, [matchId]: { ...prevMatch, [side]: val } };
      getMatchScoreSaver(matchId, side as "home" | "away")(val);
      return next;
    });
  }

  function setKnockoutWinnerResult(matchId: string, team: string | null) {
    setResults(prev => {
      const prevKO = prev.knockoutWinners ?? {};
      const next: AllResults = { ...prev, knockoutWinners: { ...prevKO, [matchId]: team } };
      getKOWinnerSaver(matchId)(team);
      return next;
    });
  }

  function setTiebreaker(group: string, type: string, team: string, val: number | undefined) {
    setResults(prev => {
      const prevTB = prev.tiebreakers ?? {};
      const prevGroup = (prevTB as Record<string, Record<string, Record<string, number | undefined>>>)[group] ?? {};
      const prevType = prevGroup[type] ?? {};
      const next: AllResults = {
        ...prev,
        tiebreakers: { ...prevTB, [group]: { ...prevGroup, [type]: { ...prevType, [team]: val } } },
      };
      tiebreakerSaver(group, type, team, val);
      return next;
    });
  }

  function setBonusIsCorrect(playerName: string, qid: string, isCorrect: boolean) {
    const pi = players.indexOf(playerName);
    if (pi < 0) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevBC = prevPlayer.bonusCorrect as Record<string, boolean> | undefined ?? {};
      return { ...prev, [pi]: { ...prevPlayer, bonusCorrect: { ...prevBC, [qid]: isCorrect } } };
    });
    saveBonusIsCorrect(playerName, qid, isCorrect).catch(console.error);
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  function calcScore(pi: number): number {
    let score = 0;
    GROUP_MATCHES.forEach(m => {
      const pred = predictions[pi]?.[m.id] as MatchPrediction | undefined;
      score += pointsForOutcome(pred, results[m.id]);
    });
    Object.entries(GROUPS).forEach(([g, teams]) => {
      if (!groupIsComplete(g, results)) return;
      if (!playerGroupIsComplete(pi, g, predictions)) return;
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) score += SCORING.tablePosition;
      });
    });
    BONUS_QUESTIONS.forEach(bq => {
      const isCorrect = (predictions[pi]?.bonusCorrect as Record<string, boolean> | undefined)?.[bq.id];
      if (isCorrect === true) score += bq.pts;
    });
    const roundsById = Object.fromEntries(KNOCKOUT_ROUNDS_META.map(r => [r.id, r]));
    const r32 = roundsById["R32"], r16 = roundsById["R16"];
    const qf  = roundsById["QF"],  sf  = roundsById["SF"], fin = roundsById["Final"];

    const allGroupsPredicted = Object.keys(GROUPS).every(g => playerGroupIsComplete(pi, g, predictions));
    const predThirdPlaces = predictions[pi]?.thirdPlaces as string[] | undefined;
    if (allGroupsPredicted && predThirdPlaces?.length === 8) {
      const actualR32Teams = new Set(
        buildR32Bracket(getQualifiers(results)).flatMap(m => [m.home, m.away]).filter(t => t !== "3rd TBD")
      );
      buildPredR32(pi, predictions).forEach(m => {
        if (m.home !== "3rd TBD" && actualR32Teams.has(m.home)) score += r32.pts;
        if (m.away !== "3rd TBD" && actualR32Teams.has(m.away)) score += r32.pts;
      });
    }

    const koW    = (predictions[pi]?.knockoutWinners ?? {}) as Record<string, string | null>;
    const actKoW = (results.knockoutWinners ?? {}) as Record<string, string | null>;
    const koTeams  = (ids: string[], src: Record<string, string | null>) =>
      new Set(ids.map(id => src[id]).filter((t): t is string => !!t));
    const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(t => b.has(t)).length;

    score += overlap(koTeams(r32.matchIds, koW), koTeams(r32.matchIds, actKoW)) * r16.pts;
    score += overlap(koTeams(r16.matchIds, koW), koTeams(r16.matchIds, actKoW)) * qf.pts;
    score += overlap(koTeams(qf.matchIds,  koW), koTeams(qf.matchIds,  actKoW)) * sf.pts;
    score += overlap(koTeams(sf.matchIds,  koW), koTeams(sf.matchIds,  actKoW)) * fin.pts;
    if (koW["M104"] && actKoW["M104"] && koW["M104"] === actKoW["M104"]) score += WinnerPoints;

    return score;
  }

  function calcScoreBreakdown(pi: number): ScoreBreakdown {
    let outcomes = 0, table = 0, bonus = 0;
    const knockout: Record<string, number> = {};
    KNOCKOUT_ROUNDS_META.forEach(r => { knockout[r.id] = 0; });
    knockout["Winner"] = 0;

    GROUP_MATCHES.forEach(m => {
      const pred = predictions[pi]?.[m.id] as MatchPrediction | undefined;
      outcomes += pointsForOutcome(pred, results[m.id]);
    });
    Object.entries(GROUPS).forEach(([g, teams]) => {
      if (!groupIsComplete(g, results)) return;
      if (!playerGroupIsComplete(pi, g, predictions)) return;
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) table += SCORING.tablePosition;
      });
    });
    BONUS_QUESTIONS.forEach(bq => {
      const isCorrect = (predictions[pi]?.bonusCorrect as Record<string, boolean> | undefined)?.[bq.id];
      if (isCorrect === true) bonus += bq.pts;
    });

    const roundsById = Object.fromEntries(KNOCKOUT_ROUNDS_META.map(r => [r.id, r]));
    const r32 = roundsById["R32"], r16 = roundsById["R16"];
    const qf  = roundsById["QF"],  sf  = roundsById["SF"], fin = roundsById["Final"];

    const allGroupsPredicted = Object.keys(GROUPS).every(g => playerGroupIsComplete(pi, g, predictions));
    const predThirdPlaces = predictions[pi]?.thirdPlaces as string[] | undefined;
    if (allGroupsPredicted && predThirdPlaces?.length === 8) {
      const actualR32Teams = new Set(
        buildR32Bracket(getQualifiers(results)).flatMap(m => [m.home, m.away]).filter(t => t !== "3rd TBD")
      );
      buildPredR32(pi, predictions).forEach(m => {
        if (m.home !== "3rd TBD" && actualR32Teams.has(m.home)) knockout["R32"] += r32.pts;
        if (m.away !== "3rd TBD" && actualR32Teams.has(m.away)) knockout["R32"] += r32.pts;
      });
    }

    const koW    = (predictions[pi]?.knockoutWinners ?? {}) as Record<string, string | null>;
    const actKoW = (results.knockoutWinners ?? {}) as Record<string, string | null>;
    const koTeams  = (ids: string[], src: Record<string, string | null>) =>
      new Set(ids.map(id => src[id]).filter((t): t is string => !!t));
    const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(t => b.has(t)).length;

    knockout["R16"]   = overlap(koTeams(r32.matchIds, koW), koTeams(r32.matchIds, actKoW)) * r16.pts;
    knockout["QF"]    = overlap(koTeams(r16.matchIds, koW), koTeams(r16.matchIds, actKoW)) * qf.pts;
    knockout["SF"]    = overlap(koTeams(qf.matchIds,  koW), koTeams(qf.matchIds,  actKoW)) * sf.pts;
    knockout["Final"] = overlap(koTeams(sf.matchIds,  koW), koTeams(sf.matchIds,  actKoW)) * fin.pts;
    if (koW["M104"] && actKoW["M104"] && koW["M104"] === actKoW["M104"]) knockout["Winner"] = WinnerPoints;

    return { outcomes, table, bonus, knockout };
  }

  const scores = activePlayers.map((_, i) => calcScore(i));

  if (!loaded) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:THEME.bgPage,color:THEME.textPrimary,fontFamily:"monospace" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:THEME.bgPage,fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif",color:THEME.textPrimary,paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#e8f5ec;}
        ::-webkit-scrollbar-thumb{background:${THEME.borderCard};border-radius:2px;}
        .tab-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:8px 14px;transition:all 0.15s;background:transparent;}
        .match-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:${THEME.bgButton};border:1px solid ${THEME.borderMuted};margin-bottom:5px;}
        .grp-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:5px 11px;border-radius:4px;transition:all 0.15s;letter-spacing:1px;}
        .bonus-input{width:100%;background:${THEME.bgInput};border:1.5px solid ${THEME.borderInput};color:${THEME.textPrimary};font-size:14px;padding:7px 10px;border-radius:6px;outline:none;font-family:'Barlow',Arial;}
        .bonus-input:focus{border-color:${THEME.gold};}
        .hscroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;}
        .hscroll::-webkit-scrollbar{height:3px;}
        .pick-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:6px 10px;border-radius:6px;transition:all 0.15s;text-align:left;width:100%;}
        .ko-team{flex:1;border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:13px;font-weight:600;padding:6px 10px;border-radius:5px;transition:all 0.15s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .hub-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:13px;font-weight:900;padding:5px 10px;border-radius:5px;transition:all 0.15s;letter-spacing:1px;min-width:32px;}
        .sort-btn{background:transparent;border:none;cursor:pointer;color:${THEME.textMuted};font-size:13px;padding:1px 3px;line-height:1;transition:color 0.1s;}
        .sort-btn:hover{color:${THEME.textSecondary};}
        .sort-btn:disabled{cursor:default;color:${THEME.borderInput};}
        .score-input{width:36px;height:32px;background:${THEME.bgInput};border:1.5px solid ${THEME.borderInput};color:${THEME.textPrimary};font-size:16px;font-weight:700;text-align:center;border-radius:5px;outline:none;font-family:inherit;}
        .score-input:focus{border-color:${THEME.blue};}
        .score-input.actual{border-color:${THEME.blue};background:${THEME.blueBg};}
        .score-input.actual:focus{border-color:${THEME.blue};}
      `}</style>

      <div style={{ background:THEME.bgHeader,padding:"18px 16px 0",borderBottom:`1px solid ${THEME.borderHeader}` }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6 }}>
            <div>
              <div style={{ fontSize:20,fontWeight:900,letterSpacing:2,textTransform:"uppercase",lineHeight:1,color:THEME.headerText }}>FIFA World Cup 2026</div>
              <div style={{ fontSize:11,color:THEME.headerSubtext,letterSpacing:3,textTransform:"uppercase",fontWeight:600 }}>Prediction Tracker</div>
            </div>
            {isAdmin && <div style={{ fontSize:10,color:THEME.headerSubtext,letterSpacing:1,fontWeight:700,background:"rgba(255,255,255,0.15)",borderRadius:4,padding:"2px 8px" }}>ADMIN</div>}
          </div>
          {activePlayers.some(p => p) && (
            <div className="hscroll" style={{ marginTop:8 }}>
              {activePlayers.map((p, i) => p ? (
                <div key={i} style={{ flexShrink:0,background:"rgba(255,255,255,0.15)",backdropFilter:"blur(4px)",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"4px 10px",minWidth:70,textAlign:"center" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:COLORS[i],whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:80 }}>{p}</div>
                  <div style={{ fontSize:20,fontWeight:900,color:THEME.headerText,lineHeight:1 }}>{scores[i]}</div>
                  <div style={{ fontSize:9,color:THEME.headerMuted,letterSpacing:1 }}>PTS</div>
                </div>
              ) : null)}
            </div>
          )}
          <div style={{ display:"flex",gap:0,marginTop:4,overflowX:"auto" }}>
            {TABS.map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)}
                style={{ color:tab===t?THEME.headerTabActive:THEME.headerMuted,borderBottom:tab===t?`2px solid ${THEME.headerTabActive}`:"2px solid transparent",flexShrink:0 }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:760,margin:"0 auto",padding:"16px 12px" }}>
        {tab === "Rules" && <RulesTab/>}

        {tab === "Predictions" && (
          <PredictionsTab
            activePlayers={activePlayers}
            selectedPlayer={selectedPlayer}
            setSelectedPlayer={setSelectedPlayer}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            predictions={predictions}
            results={results}
            setPred={setPred}
            setTableOrder={setTableOrder}
            setBonusPred={setBonusPred}
            setThirdPlacesPred={setThirdPlacesPred}
            setKnockoutWinnerPred={setKnockoutWinnerPred}
            isAdmin={isAdmin}
            isLocked={isLocked}
            lockDate={lockDate}
          />
        )}

        {tab === "Results" && (
          <ResultsTab
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            results={results}
            setResult={setResult}
            setKnockoutWinnerResult={setKnockoutWinnerResult}
            setTiebreaker={setTiebreaker}
            isLocked={isResultsLocked}
            activePlayers={activePlayers}
            predictions={predictions}
            setBonusIsCorrect={setBonusIsCorrect}
          />
        )}

        {tab === "Bracket" && (
          <BracketTab
            activePlayers={activePlayers}
            predictions={predictions}
            results={results}
            bracketView={bracketView}
            setBracketView={setBracketView}
          />
        )}

        {tab === "Standings" && (
          <StandingsTab
            activePlayers={activePlayers}
            scores={scores}
            calcScoreBreakdown={calcScoreBreakdown}
          />
        )}
      </div>
    </div>
  );
}
