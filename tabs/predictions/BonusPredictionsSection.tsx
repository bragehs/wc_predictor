import { useGame } from "../../context/GameContext";
import { useTournament } from "../../context/TournamentContext";
import { THEME } from "../../theme";
import PtsPill from "../../components/PtsPill";
import PointsBadge from "../../components/PointsBadge";

interface Props { pi: number; isEditable: boolean; }

export default function BonusPredictionsSection({ pi, isEditable }: Props) {
  const { predictions, results, setBonusPred } = useGame();
  const { bonusQuestions } = useTournament();

  return (
    <div>
      {bonusQuestions.map(bq => {
        const playerBonus = predictions[pi]?.bonus?.[bq.id] ?? "";
        const isCorrect   = predictions[pi]?.bonusCorrect?.[bq.id] ?? false;
        const actual      = results.bonusAnswers?.[bq.id];
        return (
          <div key={bq.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary }}>{bq.label}</span>
              <PtsPill pts={bq.pts} color="gold" />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="bonus-input"
                placeholder="Your answer…"
                value={playerBonus}
                onChange={e => isEditable && setBonusPred(pi, bq.id, e.target.value)}
                readOnly={!isEditable}
                style={{ opacity: isEditable ? 1 : 0.6 }}
              />
              {actual && <PointsBadge pts={isCorrect ? bq.pts : 0} />}
            </div>
            {actual && (
              <div style={{ fontSize: 11, color: THEME.blue, marginTop: 3 }}>Actual: {actual}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
