import { useState } from "react";
import type { BonusQuestion, KnockoutRoundMeta } from "../../types/index";
import { THEME } from "../../theme";
import SetupSection from "../../components/SetupSection";
import { saveBonusQuestion, deleteBonusQuestion } from "../../db";

interface BonusQuestionsSectionProps {
  bonusQuestions: BonusQuestion[];
  knockoutRounds: KnockoutRoundMeta[];
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

export default function BonusQuestionsSection({ bonusQuestions, knockoutRounds, onReload }: BonusQuestionsSectionProps) {
  const [bqId, setBqId]       = useState("");
  const [bqLabel, setBqLabel] = useState("");
  const [bqPts, setBqPts]     = useState("");

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

  return (
    <>
      <SetupSection title="Bonus Questions">
        {bonusQuestions.map((bq: BonusQuestion) => (
          <div key={bq.id} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary }}>{bq.label}</span>
            <span style={{ fontSize: 11, color: THEME.gold, minWidth: 40 }}>+{bq.pts} pts</span>
            <button style={btnStyle(THEME.red)} onClick={() => handleDeleteBQ(bq.id)}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <input style={{ ...inputStyle, width: 100 }}           placeholder="id e.g top_scorer" value={bqId}    onChange={e => setBqId(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1, minWidth: 140 }} placeholder="Label"            value={bqLabel} onChange={e => setBqLabel(e.target.value)} />
          <input style={{ ...inputStyle, width: 55 }}            placeholder="Pts" type="number"  value={bqPts}   onChange={e => setBqPts(e.target.value)} />
          <button style={btnStyle(THEME.green)} onClick={handleAddBQ}>Add</button>
        </div>
      </SetupSection>

      <SetupSection title="Knockout Rounds">
        {knockoutRounds.map((r: KnockoutRoundMeta) => (
          <div key={r.id} style={rowStyle}>
            <span style={{ flex: 1, color: THEME.textPrimary }}>{r.label}</span>
            <span style={{ fontSize: 11, color: THEME.gold }}>+{r.pts} pts</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: THEME.textFaint, marginTop: 8 }}>
          Knockout rounds are seeded via SQL. Edit points directly in the knockout_rounds table.
        </div>
      </SetupSection>
    </>
  );
}
