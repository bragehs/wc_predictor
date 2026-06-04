import { useState, useEffect } from "react";
import type { BonusQuestion, KnockoutRoundMeta, GroupMatch } from "../types/index";
import { useTournament } from "../context/TournamentContext";
import { THEME } from "../theme";
import STitle from "../components/STitle";
import {
  saveTeam, deleteTeam,
  saveMatchFixture, deleteMatchFixture,
  saveBonusQuestion, deleteBonusQuestion,
  savePlayer, deletePlayer,
  saveSetting,
} from "../db";

interface SetupTabProps {
  activePlayers: string[];
  lockDate: Date | null;
  resultsLocked: boolean;
  onReload: () => Promise<void>;
}

const sectionStyle: React.CSSProperties = {
  background: THEME.bgCard,
  border: `1px solid ${THEME.borderCard}`,
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: THEME.textMuted,
  letterSpacing: 1,
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 10,
};

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

export default function SetupTab({ activePlayers, lockDate, resultsLocked, onReload }: SetupTabProps) {
  const { groups, groupMatches, bonusQuestions, knockoutRounds } = useTournament();

  // ── Players ──────────────────────────────────────────────────────────────
  const [newPlayer, setNewPlayer] = useState("");

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

  // ── Teams & Groups ────────────────────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [teamFlag, setTeamFlag] = useState("");
  const [teamGroup, setTeamGroup] = useState("");
  const groupLetters = Object.keys(groups).sort();

  async function handleAddTeam() {
    const name = teamName.trim(), flag = teamFlag.trim(), group = teamGroup.trim().toUpperCase();
    if (!name || !flag || !group) return;
    const sortOrder = (groups[group]?.length ?? 0);
    await saveTeam(name, flag, group, sortOrder).catch(console.error);
    setTeamName(""); setTeamFlag(""); setTeamGroup("");
    onReload();
  }

  async function handleDeleteTeam(name: string) {
    await deleteTeam(name).catch(console.error);
    onReload();
  }

  // ── Match Fixtures ────────────────────────────────────────────────────────
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

  // ── Bonus Questions ───────────────────────────────────────────────────────
  const [bqId, setBqId]     = useState("");
  const [bqLabel, setBqLabel] = useState("");
  const [bqPts, setBqPts]   = useState("");

  async function handleAddBQ() {
    const id = bqId.trim(), label = bqLabel.trim(), pts = parseInt(bqPts);
    if (!id || !label || isNaN(pts)) return;
    await saveBonusQuestion(id, label, pts).catch(console.error);
    setBqId(""); setBqLabel(""); setBqPts("");
    onReload();
  }

  async function handleDeleteBQ(id: string) {
    await deleteBonusQuestion(id).catch(console.error);
    onReload();
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  const toLocalStr = (d: Date) => {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };

  const [lockDateStr, setLockDateStr] = useState(lockDate ? toLocalStr(lockDate) : "");
  const [locked, setLocked] = useState(resultsLocked);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLockDateStr(lockDate ? toLocalStr(lockDate) : ""); }, [lockDate]);
  useEffect(() => { setLocked(resultsLocked); }, [resultsLocked]);

  async function handleSaveSettings() {
    setSaving(true);
    const dateVal = lockDateStr ? new Date(lockDateStr).toISOString() : null;
    await Promise.all([
      saveSetting("predictions_lock_date", dateVal ?? "null"),
      saveSetting("results_locked", locked),
    ]).catch(console.error);
    await onReload();
    setSaving(false);
  }

  return (
    <div>
      <STitle>Setup</STitle>

      {/* Settings */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Settings</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, color: THEME.textSecondary }}>
            Predictions lock date/time
            <input type="datetime-local" style={{ ...inputStyle, display: "block", marginTop: 4, width: "100%" }}
              value={lockDateStr} onChange={e => setLockDateStr(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: THEME.textSecondary, cursor: "pointer" }}>
            <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} />
            Results locked
          </label>
          <button style={{ ...btnStyle(THEME.blue), color: "#fff", alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }} onClick={handleSaveSettings} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      {/* Players */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Players</div>
        {activePlayers.map(p => (
          <div key={p} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary, fontWeight: 600 }}>{p}</span>
            <button style={btnStyle(THEME.red)} onClick={() => handleDeletePlayer(p)}>Remove</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Player name" value={newPlayer}
            onChange={e => setNewPlayer(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddPlayer()} />
          <button style={btnStyle(THEME.green)} onClick={handleAddPlayer}>Add</button>
        </div>
      </div>

      {/* Teams & Groups */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Teams & Groups</div>
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
          <input style={{ ...inputStyle, width: 120 }} placeholder="Name" value={teamName} onChange={e => setTeamName(e.target.value)} />
          <input style={{ ...inputStyle, width: 50 }} placeholder="🏳" value={teamFlag} onChange={e => setTeamFlag(e.target.value)} />
          <input style={{ ...inputStyle, width: 50 }} placeholder="Grp" value={teamGroup} onChange={e => setTeamGroup(e.target.value)} />
          <button style={btnStyle(THEME.green)} onClick={handleAddTeam}>Add team</button>
        </div>
      </div>

      {/* Match Fixtures */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Match Fixtures ({groupMatches.length} loaded)</div>
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
          <input style={{ ...inputStyle, width: 55 }} placeholder="ID e.g A1" value={matchId} onChange={e => setMatchId(e.target.value)} />
          <input style={{ ...inputStyle, width: 110 }} placeholder="Home" value={matchHome} onChange={e => setMatchHome(e.target.value)} />
          <input style={{ ...inputStyle, width: 110 }} placeholder="Away" value={matchAway} onChange={e => setMatchAway(e.target.value)} />
          <input style={{ ...inputStyle, width: 50 }} placeholder="Grp" value={matchGroup} onChange={e => setMatchGroup(e.target.value)} />
          <input style={{ ...inputStyle, width: 70 }} placeholder="Jun 11" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
          <button style={btnStyle(THEME.green)} onClick={handleAddFixture}>Add</button>
        </div>
      </div>

      {/* Bonus Questions */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Bonus Questions</div>
        {bonusQuestions.map((bq: BonusQuestion) => (
          <div key={bq.id} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary }}>{bq.label}</span>
            <span style={{ fontSize: 11, color: THEME.gold, minWidth: 40 }}>+{bq.pts} pts</span>
            <button style={btnStyle(THEME.red)} onClick={() => handleDeleteBQ(bq.id)}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <input style={{ ...inputStyle, width: 100 }} placeholder="id e.g top_scorer" value={bqId} onChange={e => setBqId(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1, minWidth: 140 }} placeholder="Label" value={bqLabel} onChange={e => setBqLabel(e.target.value)} />
          <input style={{ ...inputStyle, width: 55 }} placeholder="Pts" type="number" value={bqPts} onChange={e => setBqPts(e.target.value)} />
          <button style={btnStyle(THEME.green)} onClick={handleAddBQ}>Add</button>
        </div>
      </div>

      {/* Knockout Rounds (read-only info for now) */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Knockout Rounds</div>
        {knockoutRounds.map((r: KnockoutRoundMeta) => (
          <div key={r.id} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary }}>{r.label}</span>
            <span style={{ fontSize: 11, color: THEME.gold }}>+{r.pts} pts</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: THEME.textFaint, marginTop: 8 }}>
          Knockout rounds are seeded via SQL. Edit points directly in the knockout_rounds table.
        </div>
      </div>

    </div>
  );
}
