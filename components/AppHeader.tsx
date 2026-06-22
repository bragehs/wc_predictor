import { useRef, useEffect } from "react";
import type { TabName } from "../types/index";
import { COLORS } from "../config";
import { THEME } from "../theme";
import { supabase } from "../supabase";
import { useGame } from "../context/GameContext";

interface AppHeaderProps {
  tab: TabName;
  setTab: (t: TabName) => void;
}

export default function AppHeader({ tab, setTab }: AppHeaderProps) {
  const { activePlayers, scores, isAdmin, isLocked } = useGame();

  // Switch to Live tab on first load once predictions are locked
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (isLocked && !defaultApplied.current) {
      defaultApplied.current = true;
      setTab("Live");
    }
  }, [isLocked, setTab]);

  const visibleTabs: TabName[] = [
    "Rules",
    ...(isLocked ? (["Live"] as TabName[]) : []),
    "Predictions",
    "Results",
    "Standings",
  ];

  function tabBtn(t: TabName, label?: string) {
    const active = tab === t;
    return (
      <button
        key={t}
        className="tab-btn"
        onClick={() => setTab(t)}
        style={{
          color: active ? THEME.headerTabActive : THEME.headerMuted,
          borderBottom: active ? `2px solid ${THEME.headerTabActive}` : "2px solid transparent",
          flexShrink: 0,
        }}
      >
        {label ?? t}
      </button>
    );
  }

  return (
    <div style={{ background: THEME.bgHeader, padding: "18px 16px 0", borderBottom: `1px solid ${THEME.borderHeader}` }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1, color: THEME.headerText }}>
              FIFA World Cup 2026
            </div>
            <div style={{ fontSize: 11, color: THEME.headerSubtext, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
              Prediction Tracker
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin && (
              <div style={{ fontSize: 10, color: THEME.headerSubtext, letterSpacing: 1, fontWeight: 700, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "2px 8px" }}>
                ADMIN
              </div>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ fontSize: 10, color: THEME.headerMuted, background: "none", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, fontWeight: 700 }}
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {activePlayers.some(p => p) && (
          <div className="hscroll" style={{ marginTop: 8 }}>
            {activePlayers.map((p, i) => p ? (
              <div key={i} style={{ flexShrink: 0, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "4px 10px", minWidth: 70, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS[i], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{p}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.headerText, lineHeight: 1 }}>{scores[i]}</div>
                <div style={{ fontSize: 9, color: THEME.headerMuted, letterSpacing: 1 }}>PTS</div>
              </div>
            ) : null)}
          </div>
        )}

        <div style={{ display: "flex", gap: 0, marginTop: 4, overflowX: "auto" }}>
          {visibleTabs.map(t => tabBtn(t))}
          {isAdmin && tabBtn("Setup")}
        </div>

      </div>
    </div>
  );
}
