import { useState, useEffect } from "react";
import { THEME } from "../../theme";
import SetupSection from "../../components/SetupSection";
import { saveSettings } from "../../db";
import { inputStyle, btnStyle } from "./setupStyles";

interface SettingsSectionProps {
  lockDate: Date | null;
  resultsLocked: boolean;
  onReload: () => Promise<void>;
}

function toLocalStr(d: Date) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function SettingsSection({ lockDate, resultsLocked, onReload }: SettingsSectionProps) {
  const [lockDateStr, setLockDateStr] = useState(lockDate ? toLocalStr(lockDate) : "");
  const [locked, setLocked] = useState(resultsLocked);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLockDateStr(lockDate ? toLocalStr(lockDate) : ""); }, [lockDate]);
  useEffect(() => { setLocked(resultsLocked); }, [resultsLocked]);

  async function handleSave() {
    setSaving(true);
    const dateVal = lockDateStr ? new Date(lockDateStr).toISOString() : null;
    await saveSettings(dateVal, locked).catch(console.error);
    await onReload();
    setSaving(false);
  }

  return (
    <SetupSection title="Settings">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: THEME.textSecondary }}>
          Predictions lock date/time
          <input
            type="datetime-local"
            style={{ ...inputStyle, display: "block", marginTop: 4, width: "100%" }}
            value={lockDateStr}
            onChange={e => setLockDateStr(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: THEME.textSecondary, cursor: "pointer" }}>
          <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} />
          Results locked
        </label>
        <button
          style={{ ...btnStyle(THEME.blue), color: "#fff", alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </SetupSection>
  );
}
