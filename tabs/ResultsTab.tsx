import { useGame } from "../context/GameContext";
import { useTournament } from "../context/TournamentContext";
import { THEME } from "../theme";
import STitle from "../components/STitle";
import StatusBanner from "../components/StatusBanner";
import FilterBar from "../components/FilterBar";
import GroupResultsSection from "./results/GroupResultsSection";
import BonusAnswersSection from "./results/BonusAnswersSection";
import KnockoutResultsSection from "./results/KnockoutResultsSection";

export default function ResultsTab() {
  const { groupFilter, setGroupFilter, isResultsLocked } = useGame();
  const { groups } = useTournament();

  const groupFilters = Object.keys(groups).map(g => ({ key: g, label: g, activeColor: THEME.blue, activeTextColor: "#fff" }));
  const extraFilters = [
    { key: "BONUS",    label: "Bonus",    activeColor: THEME.purple, activeTextColor: "#fff" },
    { key: "KNOCKOUT", label: "Knockout", activeColor: THEME.green,  activeTextColor: "#000" },
  ];

  return (
    <div>
      <STitle>Enter Real Results</STitle>

      {isResultsLocked
        ? <StatusBanner color="blue">🔒 Results are currently locked.</StatusBanner>
        : <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>
            Enter actual scores and knockout results as the tournament progresses.
          </div>
      }

      <FilterBar filters={[...groupFilters, ...extraFilters]} active={groupFilter} onChange={setGroupFilter} />

      {!["BONUS", "KNOCKOUT"].includes(groupFilter) && <GroupResultsSection />}
      {groupFilter === "BONUS"    && <BonusAnswersSection />}
      {groupFilter === "KNOCKOUT" && <KnockoutResultsSection />}
    </div>
  );
}
