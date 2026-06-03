import { useState, useEffect, useMemo, useRef } from "react";
import type { MatchPrediction, TabName, AllPredictions, AllResults, MatchOutcome, BracketView, ScoreBreakdown } from "./types/index.ts";
import { SCORING, BONUS_QUESTIONS, MAX_PLAYERS, COLORS, TABS, WinnerPoints } from "./config.ts";
import { GROUPS, GROUP_MATCHES } from "./data.js";
import { calcGroupStandings, getQualifiers, buildR32Bracket, KNOCKOUT_ROUNDS_META } from "./bracketLogic.ts";
import { supabase } from "./supabase.ts";
import {
  groupIsComplete, pointsForOutcome,
  getPredEffectiveOrder, buildPredR32,
} from "./helpers.ts";
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

  const predSavers = useRef<Record<string, ReturnType<typeof debounce>>>({});
  function getSavePredFn(playerName: string) {
    if (!predSavers.current[playerName]) {
      predSavers.current[playerName] = debounce(async (data: unknown) => {
        try {
          await supabase.from("predictions").upsert({
            player_name: playerName,
            data,
            updated_at: new Date().toISOString(),
          });
        } catch(e) { console.error("Save predictions failed:", e); }
      }, 1200);
    }
    return predSavers.current[playerName];
  }

  const debounceSaveResults = useMemo(() => debounce(async (data: AllResults) => {
    try {
      await supabase.from("results").upsert({ id: 1, data, updated_at: new Date().toISOString() });
    } catch(e) { console.error("Save results failed:", e); }
  }, 1000), []);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: settingsRows }, { data: rRow }, { data: predRows }] = await Promise.all([
          supabase.from("settings").select("*"),
          supabase.from("results").select("data").eq("id", 1).single(),
          supabase.from("predictions").select("*"),
        ]);

        const sm = Object.fromEntries(
          ((settingsRows ?? []) as Array<{ key: string; value: unknown }>).map(r => [r.key, r.value])
        );
        const playersList = Array.isArray(sm["players"]) ? (sm["players"] as string[]) : [];
        setPlayers([...playersList, ...Array(MAX_PLAYERS - playersList.length).fill("")]);
        setNumPlayers(playersList.length);

        const ld = sm["predictions_lock_date"] as string | undefined;
        if (ld && ld !== "null") setLockDate(new Date(ld));

        if (sm["results_locked"] === true) setResultsLocked(true);

        if ((rRow as { data?: AllResults } | null)?.data) {
          setResults((rRow as { data: AllResults }).data);
        }

        const predsObj: AllPredictions = {};
        ((predRows ?? []) as Array<{ player_name: string; data: unknown }>).forEach(row => {
          const idx = playersList.indexOf(row.player_name);
          if (idx >= 0) predsObj[idx] = row.data as AllPredictions[number];
        });
        setPredictions(predsObj);
      } catch(e) {
        console.error("Supabase load error:", e);
      }
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const refresh = async () => {
      try {
        const { data } = await supabase.from("results").select("data").eq("id", 1).single();
        if ((data as { data?: AllResults } | null)?.data) {
          setResults((data as { data: AllResults }).data);
        }
      } catch(_e) {}
    };
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [loaded]);

  const activePlayers = players.slice(0, numPlayers);

  function setPred(pi: number, matchId: string, side: string, val: MatchOutcome | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevMatch = prevPlayer[matchId] as MatchPrediction | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, [matchId]: { ...prevMatch, [side]: val } } };
      getSavePredFn(players[pi])(next[pi]);
      return next;
    });
  }

  function setTableOrder(pi: number, group: string, order: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevOrder = prevPlayer.tableOrder as Record<string, string[]> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, tableOrder: { ...prevOrder, [group]: order } } };
      getSavePredFn(players[pi])(next[pi]);
      return next;
    });
  }

  function setBonusPred(pi: number, qid: string, val: string) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevBonus = prevPlayer.bonus as Record<string, string> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, bonus: { ...prevBonus, [qid]: val } } };
      getSavePredFn(players[pi])(next[pi]);
      return next;
    });
  }

  function setThirdPlacesPred(pi: number, groups: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const next: AllPredictions = { ...prev, [pi]: { ...prev[pi], thirdPlaces: groups } };
      getSavePredFn(players[pi])(next[pi]);
      return next;
    });
  }

  function setKnockoutWinnerPred(pi: number, matchId: string, team: string | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const prevKO = prevPlayer.knockoutWinners as Record<string, string | null> | undefined ?? {};
      const next: AllPredictions = { ...prev, [pi]: { ...prevPlayer, knockoutWinners: { ...prevKO, [matchId]: team } } };
      getSavePredFn(players[pi])(next[pi]);
      return next;
    });
  }

  function setResult(matchId: string, side: string, val: string) {
    setResults(prev => {
      const prevMatch = prev[matchId] as { home?: string; away?: string } | undefined ?? {};
      const next: AllResults = { ...prev, [matchId]: { ...prevMatch, [side]: val } };
      debounceSaveResults(next);
      return next;
    });
  }

  function setBonusResult(qid: string, val: string) {
    setResults(prev => {
      const next: AllResults = { ...prev, [`bonus_${qid}`]: val };
      debounceSaveResults(next);
      return next;
    });
  }

  function setKnockoutWinnerResult(matchId: string, team: string | null) {
    setResults(prev => {
      const prevKO = prev.knockoutWinners ?? {};
      const next: AllResults = { ...prev, knockoutWinners: { ...prevKO, [matchId]: team } };
      debounceSaveResults(next);
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
        tiebreakers: {
          ...prevTB,
          [group]: {
            ...prevGroup,
            [type]: { ...prevType, [team]: val },
          },
        },
      };
      debounceSaveResults(next);
      return next;
    });
  }

  function calcScore(pi: number): number {
    let score = 0;
    GROUP_MATCHES.forEach(m => {
      const pred = predictions[pi]?.[m.id] as MatchPrediction | undefined;
      score += pointsForOutcome(pred, results[m.id]);
    });
    Object.entries(GROUPS).forEach(([g, teams]) => {
      if (!groupIsComplete(g, results)) return;
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) score += SCORING.tablePosition;
      });
    });
    BONUS_QUESTIONS.forEach(bq => {
      const pred   = (predictions[pi]?.bonus as Record<string, string> | undefined)?.[bq.id];
      const actual = results[`bonus_${bq.id}`] as string | undefined;
      if (pred && actual && pred.toLowerCase().trim() === actual.toLowerCase().trim())
        score += bq.pts;
    });
    const roundsById = Object.fromEntries(KNOCKOUT_ROUNDS_META.map(r => [r.id, r]));
    const r32 = roundsById["R32"], r16 = roundsById["R16"];
    const qf  = roundsById["QF"],  sf  = roundsById["SF"], fin = roundsById["Final"];

    const actualR32Teams = new Set(
      buildR32Bracket(getQualifiers(results)).flatMap(m => [m.home, m.away]).filter(t => t !== "3rd TBD")
    );
    buildPredR32(pi, predictions).forEach(m => {
      if (m.home !== "3rd TBD" && actualR32Teams.has(m.home)) score += r32.pts;
      if (m.away !== "3rd TBD" && actualR32Teams.has(m.away)) score += r32.pts;
    });

    const koW    = (predictions[pi]?.knockoutWinners ?? {}) as Record<string, string | null>;
    const actKoW = (results.knockoutWinners ?? {}) as Record<string, string | null>;
    const teams  = (ids: string[], src: Record<string, string | null>) =>
      new Set(ids.map(id => src[id]).filter((t): t is string => !!t));
    const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(t => b.has(t)).length;

    score += overlap(teams(r32.matchIds, koW), teams(r32.matchIds, actKoW)) * r16.pts;
    score += overlap(teams(r16.matchIds, koW), teams(r16.matchIds, actKoW)) * qf.pts;
    score += overlap(teams(qf.matchIds,  koW), teams(qf.matchIds,  actKoW)) * sf.pts;
    score += overlap(teams(sf.matchIds,  koW), teams(sf.matchIds,  actKoW)) * fin.pts;
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
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) table += SCORING.tablePosition;
      });
    });
    BONUS_QUESTIONS.forEach(bq => {
      const pred   = (predictions[pi]?.bonus as Record<string, string> | undefined)?.[bq.id];
      const actual = results[`bonus_${bq.id}`] as string | undefined;
      if (pred && actual && pred.toLowerCase().trim() === actual.toLowerCase().trim())
        bonus += bq.pts;
    });

    const roundsById = Object.fromEntries(KNOCKOUT_ROUNDS_META.map(r => [r.id, r]));
    const r32 = roundsById["R32"], r16 = roundsById["R16"];
    const qf  = roundsById["QF"],  sf  = roundsById["SF"], fin = roundsById["Final"];

    const actualR32Teams = new Set(
      buildR32Bracket(getQualifiers(results)).flatMap(m => [m.home, m.away]).filter(t => t !== "3rd TBD")
    );
    buildPredR32(pi, predictions).forEach(m => {
      if (m.home !== "3rd TBD" && actualR32Teams.has(m.home)) knockout["R32"] += r32.pts;
      if (m.away !== "3rd TBD" && actualR32Teams.has(m.away)) knockout["R32"] += r32.pts;
    });

    const koW    = (predictions[pi]?.knockoutWinners ?? {}) as Record<string, string | null>;
    const actKoW = (results.knockoutWinners ?? {}) as Record<string, string | null>;
    const teams  = (ids: string[], src: Record<string, string | null>) =>
      new Set(ids.map(id => src[id]).filter((t): t is string => !!t));
    const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(t => b.has(t)).length;

    knockout["R16"]   = overlap(teams(r32.matchIds, koW), teams(r32.matchIds, actKoW)) * r16.pts;
    knockout["QF"]    = overlap(teams(r16.matchIds, koW), teams(r16.matchIds, actKoW)) * qf.pts;
    knockout["SF"]    = overlap(teams(qf.matchIds,  koW), teams(qf.matchIds,  actKoW)) * sf.pts;
    knockout["Final"] = overlap(teams(sf.matchIds,  koW), teams(sf.matchIds,  actKoW)) * fin.pts;
    if (koW["M104"] && actKoW["M104"] && koW["M104"] === actKoW["M104"]) knockout["Winner"] = WinnerPoints;

    return { outcomes, table, bonus, knockout };
  }

  const scores = activePlayers.map((_, i) => calcScore(i));

  if (!loaded) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#080810",color:"#fff",fontFamily:"monospace" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#080810",fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif",color:"#f0f0f0",paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#111;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .tab-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:8px 14px;transition:all 0.15s;background:transparent;}
        .match-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:#12121c;border:1px solid #1c1c2c;margin-bottom:5px;}
        .grp-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:5px 11px;border-radius:4px;transition:all 0.15s;letter-spacing:1px;}
        .bonus-input{width:100%;background:#080810;border:1.5px solid #252535;color:#fff;font-size:14px;padding:7px 10px;border-radius:6px;outline:none;font-family:'Barlow',Arial;}
        .bonus-input:focus{border-color:#f97316;}
        .bonus-input.actual{border-color:#3b82f6;}
        .hscroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;}
        .hscroll::-webkit-scrollbar{height:3px;}
        .pick-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:6px 10px;border-radius:6px;transition:all 0.15s;text-align:left;width:100%;}
        .ko-team{flex:1;border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:11px;font-weight:600;padding:5px 8px;border-radius:5px;transition:all 0.15s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .hub-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:13px;font-weight:900;padding:5px 10px;border-radius:5px;transition:all 0.15s;letter-spacing:1px;min-width:32px;}
        .sort-btn{background:transparent;border:none;cursor:pointer;color:#555;font-size:13px;padding:1px 3px;line-height:1;transition:color 0.1s;}
        .sort-btn:hover{color:#aaa;}
        .sort-btn:disabled{cursor:default;color:#252535;}
        .score-input{width:36px;height:32px;background:#080810;border:1.5px solid #252535;color:#fff;font-size:16px;font-weight:700;text-align:center;border-radius:5px;outline:none;font-family:inherit;}
        .score-input:focus{border-color:#3b82f6;}
        .score-input.actual{border-color:#3b82f6;background:#0c1118;}
        .score-input.actual:focus{border-color:#60a5fa;}
      `}</style>

      <div style={{ background:"linear-gradient(135deg,#1a0800 0%,#080810 60%)",padding:"18px 16px 0",borderBottom:"1px solid #181828" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6 }}>
            <div>
              <div style={{ fontSize:20,fontWeight:900,letterSpacing:2,textTransform:"uppercase",lineHeight:1 }}>FIFA World Cup 2026</div>
              <div style={{ fontSize:11,color:"#f97316",letterSpacing:3,textTransform:"uppercase",fontWeight:600 }}>Prediction Tracker</div>
            </div>
            {isAdmin && <div style={{ fontSize:10,color:"#10b981",letterSpacing:1,fontWeight:700 }}>ADMIN</div>}
          </div>
          {activePlayers.some(p => p) && (
            <div className="hscroll" style={{ marginTop:8 }}>
              {activePlayers.map((p, i) => p ? (
                <div key={i} style={{ flexShrink:0,background:`${COLORS[i]}15`,border:`1.5px solid ${COLORS[i]}44`,borderRadius:8,padding:"4px 10px",minWidth:70,textAlign:"center" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:COLORS[i],whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:80 }}>{p}</div>
                  <div style={{ fontSize:20,fontWeight:900,color:"#fff",lineHeight:1 }}>{scores[i]}</div>
                  <div style={{ fontSize:9,color:"#666",letterSpacing:1 }}>PTS</div>
                </div>
              ) : null)}
            </div>
          )}
          <div style={{ display:"flex",gap:0,marginTop:4,overflowX:"auto" }}>
            {TABS.map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)}
                style={{ color:tab===t?"#f97316":"#666",borderBottom:tab===t?"2px solid #f97316":"2px solid transparent",flexShrink:0 }}>
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
            setBonusResult={setBonusResult}
            setKnockoutWinnerResult={setKnockoutWinnerResult}
            setTiebreaker={setTiebreaker}
            isLocked={isResultsLocked}
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
