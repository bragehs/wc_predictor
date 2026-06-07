import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AllPredictions, AllResults, MatchOutcome, ScoreBreakdown, TournamentConfig } from "../types/index";
import type { PlayerMeta } from "../db";
import { saveBonusIsCorrect, loadAllData, loadResults } from "../db";
import { MAX_PLAYERS } from "../config";
import { THEME } from "../theme";
import { supabase } from "../supabase";
import { initTournamentStore } from "../tournamentStore";
import { TournamentContext } from "./TournamentContext";
import { useDebouncedSavers } from "../hooks/useDebouncedSavers";
import { useScoring } from "../hooks/useScoring";

// ── Public interface ───────────────────────────────────────────────────────────

export interface GameContextValue {
  // Game state
  predictions: AllPredictions;
  results: AllResults;
  players: string[];
  activePlayers: string[];
  playersMeta: PlayerMeta[];
  lockDate: Date | null;
  resultsLocked: boolean;
  isLocked: boolean;
  isResultsLocked: boolean;
  isAdmin: boolean;
  myPlayerIndex: number;
  groupFilter: string;

  // Scoring
  scores: number[];
  calcScoreBreakdown: (pi: number) => ScoreBreakdown;

  // Prediction setters
  setPred: (pi: number, matchId: string, side: string, val: MatchOutcome | null) => void;
  setTableOrder: (pi: number, group: string, order: string[]) => void;
  setBonusPred: (pi: number, qid: string, val: string) => void;
  setThirdPlacesPred: (pi: number, groups: string[]) => void;
  setKnockoutWinnerPred: (pi: number, matchId: string, team: string | null) => void;

  // Result setters
  setResult: (matchId: string, side: string, val: string) => void;
  setKnockoutWinnerResult: (matchId: string, team: string | null) => void;
  setTiebreaker: (group: string, type: string, team: string, val: number | undefined) => void;
  setBonusIsCorrect: (playerName: string, qid: string, isCorrect: boolean) => void;

  // Navigation
  setGroupFilter: (g: string) => void;

  // Data
  reload: () => Promise<void>;
}

// ── Context setup ──────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue>(null!);

export function useGame(): GameContextValue {
  return useContext(GameContext);
}

// ── Provider ───────────────────────────────────────────────────────────────────

interface GameProviderProps {
  session: Session | null;
  children: React.ReactNode;
}

export function GameProvider({ session, children }: GameProviderProps) {
  const [loaded, setLoaded]   = useState(false);
  const [groupFilter, setGroupFilter] = useState("A");

  const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig>({
    groups: {}, groupMatches: [], flags: {}, bonusQuestions: [], knockoutRounds: [],
  });

  const [players, setPlayers]         = useState<string[]>(Array(MAX_PLAYERS).fill(""));
  const [numPlayers, setNumPlayers]   = useState(0);
  const [predictions, setPredictions] = useState<AllPredictions>({});
  const [results, setResults]         = useState<AllResults>({ matchResults: {} });
  const [lockDate, setLockDate]       = useState<Date | null>(null);
  const [resultsLocked, setResultsLocked] = useState(false);
  const [playersMeta, setPlayersMeta] = useState<PlayerMeta[]>([]);

  function applyData(data: Awaited<ReturnType<typeof loadAllData>>) {
    const cfg = data.tournamentConfig;
    initTournamentStore(cfg.groups, cfg.groupMatches, cfg.flags);
    setTournamentConfig(cfg);
    setPlayers([...data.players, ...Array(MAX_PLAYERS - data.players.length).fill("")]);
    setNumPlayers(data.players.length);
    setLockDate(data.lockDate);
    setResultsLocked(data.resultsLocked);
    setResults(data.results);
    setPredictions(data.predictions);
    setPlayersMeta(data.playersMeta);
  }

  useEffect(() => {
    loadAllData().then(data => {
      applyData(data);
      setLoaded(true);
    }).catch(e => {
      console.error("Supabase load error:", e);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const refresh = async () => { try { setResults(await loadResults()); } catch(_e) {} };
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [loaded]);

  // ── Derived auth values ────────────────────────────────────────────────────

  const myPlayerMeta = useMemo(
    () => session?.user?.email ? playersMeta.find(p => p.email === session.user.email) ?? null : null,
    [session, playersMeta]
  );
  const myPlayer      = myPlayerMeta?.approved ? myPlayerMeta : null;
  const isAdmin       = myPlayer?.isAdmin ?? false;
  const myPlayerIndex = useMemo(
    () => myPlayer ? players.indexOf(myPlayer.name) : 0,
    [myPlayer, players]
  );
  const isLocked        = !!(lockDate && new Date() > lockDate && !isAdmin);
  const isResultsLocked = resultsLocked && !isAdmin;
  const activePlayers   = players.slice(0, numPlayers);

  const savers = useDebouncedSavers();
  const { scores, calcScoreBreakdown } = useScoring(numPlayers, predictions, results, tournamentConfig);

  const reload = () => loadAllData().then(applyData).catch(console.error);

  // ── Prediction setters ─────────────────────────────────────────────────────

  function setPred(pi: number, matchId: string, side: string, val: MatchOutcome | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? { matchPredictions: {} };
      const prevMatch  = prevPlayer.matchPredictions[matchId] ?? {};
      const next: AllPredictions = {
        ...prev,
        [pi]: { ...prevPlayer, matchPredictions: { ...prevPlayer.matchPredictions, [matchId]: { ...prevMatch, [side]: val } } },
      };
      if (side === "outcome") savers.getMatchPredSaver(players[pi], matchId)(val);
      return next;
    });
  }

  function setTableOrder(pi: number, group: string, order: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const next: AllPredictions = {
        ...prev,
        [pi]: { ...prevPlayer, tableOrder: { ...(prevPlayer.tableOrder ?? {}), [group]: order } },
      };
      savers.getTablePredSaver(players[pi], group)(order);
      return next;
    });
  }

  function setBonusPred(pi: number, qid: string, val: string) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const next: AllPredictions = {
        ...prev,
        [pi]: { ...prevPlayer, bonus: { ...(prevPlayer.bonus ?? {}), [qid]: val } },
      };
      savers.getBonusSaver(players[pi], qid)(val);
      return next;
    });
  }

  function setThirdPlacesPred(pi: number, groups: string[]) {
    if (isLocked) return;
    setPredictions(prev => {
      const next: AllPredictions = { ...prev, [pi]: { ...prev[pi], thirdPlaces: groups } };
      savers.getThirdPlacesSaver(players[pi])(groups);
      return next;
    });
  }

  function setKnockoutWinnerPred(pi: number, matchId: string, team: string | null) {
    if (isLocked) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      const next: AllPredictions = {
        ...prev,
        [pi]: { ...prevPlayer, knockoutWinners: { ...(prevPlayer.knockoutWinners ?? {}), [matchId]: team } },
      };
      savers.getKOPredSaver(players[pi], matchId)(team);
      return next;
    });
  }

  // ── Result setters ─────────────────────────────────────────────────────────

  function setResult(matchId: string, side: string, val: string) {
    setResults(prev => {
      const prevMatch = prev.matchResults[matchId] ?? {};
      const next: AllResults = {
        ...prev,
        matchResults: { ...prev.matchResults, [matchId]: { ...prevMatch, [side]: val } },
      };
      savers.getMatchScoreSaver(matchId, side as "home" | "away")(val);
      return next;
    });
  }

  function setKnockoutWinnerResult(matchId: string, team: string | null) {
    setResults(prev => {
      const next: AllResults = { ...prev, knockoutWinners: { ...(prev.knockoutWinners ?? {}), [matchId]: team } };
      savers.getKOWinnerSaver(matchId)(team);
      return next;
    });
  }

  function setTiebreaker(group: string, type: string, team: string, val: number | undefined) {
    setResults(prev => {
      const prevTB    = prev.tiebreakers ?? {};
      const prevGroup = (prevTB[group] as Record<string, Record<string, number | undefined>> | undefined) ?? {};
      const prevType  = prevGroup[type] ?? {};
      const next: AllResults = {
        ...prev,
        tiebreakers: { ...prevTB, [group]: { ...prevGroup, [type]: { ...prevType, [team]: val } } },
      };
      savers.tiebreakerSaver(group, type, team, val);
      return next;
    });
  }

  function handleSetBonusIsCorrect(playerName: string, qid: string, isCorrect: boolean) {
    const pi = players.indexOf(playerName);
    if (pi < 0) return;
    setPredictions(prev => {
      const prevPlayer = prev[pi] ?? {};
      return {
        ...prev,
        [pi]: { ...prevPlayer, bonusCorrect: { ...(prevPlayer.bonusCorrect ?? {}), [qid]: isCorrect } },
      };
    });
    saveBonusIsCorrect(playerName, qid, isCorrect).catch(console.error);
  }

  // ── Loading / registration gates ───────────────────────────────────────────

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bgPage, color: THEME.textPrimary, fontFamily: "monospace" }}>
        Loading...
      </div>
    );
  }

  if (!myPlayer) {
    const isPending = !!myPlayerMeta && !myPlayerMeta.approved;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bgPage, color: THEME.textPrimary, fontFamily: "'Barlow Condensed', Arial", gap: 16, textAlign: "center", padding: 24 }}>
        {isPending ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Registration pending</div>
            <div style={{ fontSize: 14, color: THEME.textMuted, fontFamily: "'Barlow', Arial" }}>
              Your registration as <strong>{myPlayerMeta!.name}</strong> is waiting for admin approval.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Not registered</div>
            <div style={{ fontSize: 14, color: THEME.textMuted, fontFamily: "'Barlow', Arial" }}>
              <strong>{session?.user?.email}</strong> is not linked to any player.
            </div>
          </>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: THEME.red, border: "none", borderRadius: 6, padding: "8px 20px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // ── Context value ──────────────────────────────────────────────────────────

  const value: GameContextValue = {
    predictions, results, players, activePlayers, playersMeta,
    lockDate, resultsLocked, isLocked, isResultsLocked, isAdmin, myPlayerIndex,
    groupFilter, setGroupFilter,
    scores, calcScoreBreakdown,
    setPred, setTableOrder, setBonusPred, setThirdPlacesPred, setKnockoutWinnerPred,
    setResult, setKnockoutWinnerResult, setTiebreaker,
    setBonusIsCorrect: handleSetBonusIsCorrect,
    reload,
  };

  return (
    <TournamentContext.Provider value={tournamentConfig}>
      <GameContext.Provider value={value}>{children}</GameContext.Provider>
    </TournamentContext.Provider>
  );
}
