import { useState } from "react";
import { COLORS } from "../config";
import { useGame } from "../context/GameContext";
import { useTournament } from "../context/TournamentContext";
import { THEME } from "../theme";
import STitle from "../components/STitle";
import StatusBanner from "../components/StatusBanner";
import FilterBar from "../components/FilterBar";
import BracketPredictions from "../components/BracketPredictions";
import GroupPredictionsSection from "./predictions/GroupPredictionsSection";
import BonusPredictionsSection from "./predictions/BonusPredictionsSection";

export default function PredictionsTab() {
  const { activePlayers, myPlayerIndex, groupFilter, setGroupFilter, isAdmin, isLocked, lockDate, predictions, results, setThirdPlacesPred, setKnockoutWinnerPred } = useGame();
  const { groups } = useTournament();
  const [selectedPlayer, setSelectedPlayer] = useState(myPlayerIndex);

  const showSwitcher = isAdmin || isLocked;
  const pi           = showSwitcher ? selectedPlayer : myPlayerIndex;
  const isEditable   = isAdmin || !isLocked;

  const groupFilters = Object.keys(groups).map(g => ({ key: g, label: g, activeColor: THEME.gold, activeTextColor: "#000" }));
  const extraFilters = [
    { key: "BONUS",   label: "Bonus",   activeColor: THEME.purple, activeTextColor: "#fff" },
    { key: "BRACKET", label: "Bracket", activeColor: THEME.red,    activeTextColor: "#fff" },
  ];

  return (
    <div>
      <STitle>Predictions</STitle>

      {isLocked && (
        <StatusBanner color="blue">
          🔒 Predictions locked{lockDate
            ? ` since ${lockDate.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })}`
            : ""}
        </StatusBanner>
      )}

      {isAdmin && (
        <StatusBanner color="green">Admin mode — editing all predictions.</StatusBanner>
      )}

      {showSwitcher && (
        <div style={{ marginBottom: 12 }}>
          <button
            className="grp-btn"
            onClick={() => setSelectedPlayer(myPlayerIndex)}
            style={{
              width:      "100%",
              background: pi === myPlayerIndex ? COLORS[myPlayerIndex] : THEME.bgButton,
              color:      pi === myPlayerIndex ? "#000" : THEME.textSecondary,
              border:     `1px solid ${pi === myPlayerIndex ? COLORS[myPlayerIndex] : THEME.borderCard}`,
              marginBottom: 6,
            }}
          >
            {activePlayers[myPlayerIndex] || `P${myPlayerIndex + 1}`}
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, marginLeft: 6, letterSpacing: 1, textTransform: "uppercase" }}>you</span>
          </button>
          <div className="hscroll">
            {activePlayers.map((p, i) => i === myPlayerIndex || !p ? null : (
              <button
                key={i}
                className="grp-btn"
                onClick={() => setSelectedPlayer(i)}
                style={{
                  background: pi === i ? COLORS[i] : THEME.bgButton,
                  color:      pi === i ? "#000"     : THEME.textSecondary,
                  border:     `1px solid ${pi === i ? COLORS[i] : THEME.borderCard}`,
                  flexShrink: 0,
                }}
              >
                {p || `P${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <FilterBar filters={[...groupFilters, ...extraFilters]} active={groupFilter} onChange={setGroupFilter} />

      {groups[groupFilter] !== undefined && <GroupPredictionsSection pi={pi} isEditable={isEditable} />}
      {groupFilter === "BONUS"   && <BonusPredictionsSection pi={pi} isEditable={isEditable} />}
      {groupFilter === "BRACKET" && (
        <BracketPredictions
          pi={pi}
          predictions={predictions}
          results={results}
          setThirdPlacesPred={setThirdPlacesPred}
          setKnockoutWinnerPred={setKnockoutWinnerPred}
          isEditable={isEditable}
        />
      )}
    </div>
  );
}
