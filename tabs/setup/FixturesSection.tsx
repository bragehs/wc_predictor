import { useState } from "react";
import type { GroupMatch } from "../../types/index";
import { THEME } from "../../theme";
import SetupSection from "../../components/SetupSection";
import { saveMatchFixture, deleteMatchFixture } from "../../db";
import { inputStyle, btnStyle, rowStyle } from "./setupStyles";

interface FixturesSectionProps {
  groupMatches: GroupMatch[];
  onReload: () => Promise<void>;
}

export default function FixturesSection({ groupMatches, onReload }: FixturesSectionProps) {
  const [matchId, setMatchId]     = useState("");
  const [matchHome, setMatchHome] = useState("");
  const [matchAway, setMatchAway] = useState("");
  const [matchGroup, setMatchGroup] = useState("");
  const [matchDate, setMatchDate]  = useState("");

  async function handleAddFixture() {
    const id = matchId.trim(), home = matchHome.trim(), away = matchAway.trim();
    const group = matchGroup.trim().toUpperCase(), date = matchDate.trim();
    if (!id || !home || !away || !group) return;
    await saveMatchFixture(id, home, away, group, date).catch(console.error);
    setMatchId(""); setMatchHome(""); setMatchAway(""); setMatchGroup(""); setMatchDate("");
    onReload();
  }

  async function handleDeleteFixture(id: string) {
    await deleteMatchFixture(id).catch(console.error);
    onReload();
  }

  return (
    <SetupSection title={`Match Fixtures (${groupMatches.length} loaded)`}>
      <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
        {groupMatches.map((m: GroupMatch) => (
          <div key={m.id} style={rowStyle}>
            <span style={{ fontSize: 11, color: THEME.textFaint, minWidth: 32 }}>{m.id}</span>
            <span style={{ flex: 1, color: THEME.textPrimary, fontSize: 12 }}>{m.home} vs {m.away}</span>
            <span style={{ fontSize: 11, color: THEME.textMuted, minWidth: 40 }}>{m.date}</span>
            <button style={btnStyle(THEME.red)} onClick={() => handleDeleteFixture(m.id)}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, width: 55  }} placeholder="ID e.g A1" value={matchId}    onChange={e => setMatchId(e.target.value)} />
        <input style={{ ...inputStyle, width: 110 }} placeholder="Home"       value={matchHome}  onChange={e => setMatchHome(e.target.value)} />
        <input style={{ ...inputStyle, width: 110 }} placeholder="Away"       value={matchAway}  onChange={e => setMatchAway(e.target.value)} />
        <input style={{ ...inputStyle, width: 50  }} placeholder="Grp"        value={matchGroup} onChange={e => setMatchGroup(e.target.value)} />
        <input style={{ ...inputStyle, width: 70  }} placeholder="Jun 11"     value={matchDate}  onChange={e => setMatchDate(e.target.value)} />
        <button style={btnStyle(THEME.green)} onClick={handleAddFixture}>Add</button>
      </div>
    </SetupSection>
  );
}
