import { useTournament } from "../context/TournamentContext";
import { useGame } from "../context/GameContext";
import STitle from "../components/STitle";
import SettingsSection      from "./setup/SettingsSection";
import PlayersSection       from "./setup/PlayersSection";
import TeamsSection         from "./setup/TeamsSection";
import FixturesSection      from "./setup/FixturesSection";
import BonusQuestionsSection from "./setup/BonusQuestionsSection";

export default function SetupTab() {
  const { groups, groupMatches, bonusQuestions, knockoutRounds } = useTournament();
  const { activePlayers, playersMeta, lockDate, resultsLocked, reload, isAdmin } = useGame();
  if (!isAdmin) return null;

  return (
    <div>
      <STitle>Setup</STitle>
      <SettingsSection lockDate={lockDate} resultsLocked={resultsLocked} onReload={reload} />
      <PlayersSection activePlayers={activePlayers} playersMeta={playersMeta} onReload={reload} />
      <TeamsSection groups={groups} onReload={reload} />
      <FixturesSection groupMatches={groupMatches} onReload={reload} />
      <BonusQuestionsSection bonusQuestions={bonusQuestions} knockoutRounds={knockoutRounds} onReload={reload} />
    </div>
  );
}
