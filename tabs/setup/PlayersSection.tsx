import { useState, useEffect } from "react";
import type { PlayerMeta } from "../../db";
import { THEME } from "../../theme";
import SetupSection from "../../components/SetupSection";
import { savePlayer, deletePlayer, savePlayerEmail, approvePlayer } from "../../db";

interface PlayersSectionProps {
  activePlayers: string[];
  playersMeta: PlayerMeta[];
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

export default function PlayersSection({ activePlayers, playersMeta, onReload }: PlayersSectionProps) {
  const [newPlayer, setNewPlayer] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const drafts: Record<string, string> = {};
    playersMeta.forEach(p => { drafts[p.name] = p.email ?? ""; });
    setEmailDrafts(drafts);
  }, [playersMeta]);

  async function handleAddPlayer() {
    const name = newPlayer.trim();
    if (!name) return;
    await savePlayer(name).catch(console.error);
    setNewPlayer("");
    onReload();
  }

  async function handleDeletePlayer(name: string) {
    if (!confirm(`Remove player "${name}"? Their predictions will remain in the DB.`)) return;
    await deletePlayer(name).catch(console.error);
    onReload();
  }

  async function handleSaveEmail(name: string) {
    await savePlayerEmail(name, emailDrafts[name] ?? "").catch(console.error);
    onReload();
  }

  return (
    <>
      <SetupSection title="Players">
        {activePlayers.map(p => (
          <div key={p} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary, fontWeight: 600 }}>{p}</span>
            <button style={btnStyle(THEME.red)} onClick={() => handleDeletePlayer(p)}>Remove</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Player name"
            value={newPlayer}
            onChange={e => setNewPlayer(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
          />
          <button style={btnStyle(THEME.green)} onClick={handleAddPlayer}>Add</button>
        </div>
      </SetupSection>

      {playersMeta.some(p => !p.approved) && (
        <SetupSection title="Pending approval" titleColor={THEME.gold} borderColor={THEME.goldBorder}>
          {playersMeta.filter(p => !p.approved).map(p => (
            <div key={p.name} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: THEME.textPrimary, fontSize: 13 }}>{p.name}</span>
                {p.email && (
                  <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 8 }}>{p.email}</span>
                )}
              </div>
              <button
                style={{ ...btnStyle(THEME.green), marginRight: 4 }}
                onClick={async () => { await approvePlayer(p.name).catch(console.error); onReload(); }}
              >
                Approve
              </button>
              <button
                style={btnStyle(THEME.red)}
                onClick={async () => {
                  if (!confirm(`Reject "${p.name}"?`)) return;
                  await deletePlayer(p.name).catch(console.error);
                  onReload();
                }}
              >
                Reject
              </button>
            </div>
          ))}
        </SetupSection>
      )}

      <SetupSection title="Player emails (for magic link login)">
        {playersMeta.map(p => (
          <div key={p.name} style={{ ...rowStyle, gap: 8 }}>
            <span style={{ minWidth: 80, color: THEME.textPrimary, fontWeight: 600, fontSize: 13 }}>{p.name}</span>
            <input
              style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              type="email"
              placeholder="email@example.com"
              value={emailDrafts[p.name] ?? ""}
              onChange={e => setEmailDrafts(prev => ({ ...prev, [p.name]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSaveEmail(p.name)}
            />
            <button style={{ ...btnStyle(THEME.blue), color: "#fff" }} onClick={() => handleSaveEmail(p.name)}>
              Save
            </button>
          </div>
        ))}
      </SetupSection>
    </>
  );
}
