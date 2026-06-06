import { useState } from "react";
import { THEME } from "../../theme";
import SetupSection from "../../components/SetupSection";
import { saveTeam, deleteTeam } from "../../db";

interface TeamsSectionProps {
  groups: Record<string, string[]>;
  onReload: () => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  background: THEME.bgInput,
  border: `1.5px solid ${THEME.borderInput}`,
  color: THEME.textPrimary,
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
};

const btnStyle = (color: string): React.CSSProperties => ({
  background: color,
  border: "none",
  borderRadius: 5,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Barlow Condensed', Arial",
  color: "#000",
});

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 0",
  borderBottom: `1px solid ${THEME.borderFaint}`,
  fontSize: 13,
};

export default function TeamsSection({ groups, onReload }: TeamsSectionProps) {
  const [teamName, setTeamName] = useState("");
  const [teamFlag, setTeamFlag] = useState("");
  const [teamGroup, setTeamGroup] = useState("");

  const groupLetters = Object.keys(groups).sort();

  async function handleAddTeam() {
    const name = teamName.trim(), flag = teamFlag.trim(), group = teamGroup.trim().toUpperCase();
    if (!name || !flag || !group) return;
    const sortOrder = groups[group]?.length ?? 0;
    await saveTeam(name, flag, group, sortOrder).catch(console.error);
    setTeamName(""); setTeamFlag(""); setTeamGroup("");
    onReload();
  }

  async function handleDeleteTeam(name: string) {
    await deleteTeam(name).catch(console.error);
    onReload();
  }

  return (
    <SetupSection title="Teams & Groups">
      {groupLetters.map(g => (
        <div key={g} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: THEME.blue, fontWeight: 700, marginBottom: 4 }}>Group {g}</div>
          {(groups[g] ?? []).map(team => (
            <div key={team} style={rowStyle}>
              <span style={{ flex: 1, color: THEME.textPrimary }}>{team}</span>
              <button style={btnStyle(THEME.red)} onClick={() => handleDeleteTeam(team)}>✕</button>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <input style={{ ...inputStyle, width: 120 }} placeholder="Name"  value={teamName}  onChange={e => setTeamName(e.target.value)} />
        <input style={{ ...inputStyle, width: 50  }} placeholder="🏳"    value={teamFlag}  onChange={e => setTeamFlag(e.target.value)} />
        <input style={{ ...inputStyle, width: 50  }} placeholder="Grp"   value={teamGroup} onChange={e => setTeamGroup(e.target.value)} />
        <button style={btnStyle(THEME.green)} onClick={handleAddTeam}>Add team</button>
      </div>
    </SetupSection>
  );
}
