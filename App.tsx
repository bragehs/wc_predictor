import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { TabName } from "./types/index.ts";
import { THEME } from "./theme.ts";
import AuthScreen from "./AuthScreen.tsx";
import { GameProvider } from "./context/GameContext.tsx";
import AppHeader from "./components/AppHeader.tsx";
import RulesTab       from "./tabs/RulesTab.tsx";
import PredictionsTab from "./tabs/PredictionsTab.tsx";
import ResultsTab     from "./tabs/ResultsTab.tsx";
import StandingsTab   from "./tabs/StandingsTab.tsx";
import SetupTab       from "./tabs/SetupTab.tsx";

export default function App() {
  const [tab, setTab]         = useState<TabName>("Predictions");
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bgPage, color: THEME.textPrimary, fontFamily: "monospace" }}>
      Loading...
    </div>
  );

  if (!session) return <AuthScreen />;

  return (
    <GameProvider session={session}>
      <div style={{ minHeight: "100vh", background: THEME.bgPage, fontFamily: "'Barlow Condensed','Arial Narrow',Arial,sans-serif", color: THEME.textPrimary, paddingBottom: 80 }}>
        <AppHeader tab={tab} setTab={setTab} />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px" }}>
          {tab === "Rules"       && <RulesTab />}
          {tab === "Predictions" && <PredictionsTab />}
          {tab === "Results"     && <ResultsTab />}
          {tab === "Standings"   && <StandingsTab />}
          {tab === "Setup"       && <SetupTab />}
        </div>
      </div>
    </GameProvider>
  );
}
