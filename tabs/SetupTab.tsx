import type { PlayerMeta } from "../db";
import { useTournament } from "../context/TournamentContext";
import STitle from "../components/STitle";
import SettingsSection      from "./setup/SettingsSection";
import PlayersSection       from "./setup/PlayersSection";
import TeamsSection         from "./setup/TeamsSection";
import FixturesSection      from "./setup/FixturesSection";
import BonusQuestionsSection from "./setup/BonusQuestionsSection";

interface SetupTabProps {
  activePlayers: string[];
  playersMeta: PlayerMeta[];
  lockDate: Date | null;
  resultsLocked: boolean;
  onReload: () => Promise<void>;
}

export default function SetupTab({ activePlayers, playersMeta, lockDate, resultsLocked, onReload }: SetupTabProps) {
  const { groups, groupMatches, bonusQuestions, knockoutRounds } = useTournament();

  return (
    <div>
      <STitle>Setup</STitle>
      <SettingsSection lockDate={lockDate} resultsLocked={resultsLocked} onReload={onReload} />
      <PlayersSection activePlayers={activePlayers} playersMeta={playersMeta} onReload={onReload} />
      <TeamsSection groups={groups} onReload={onReload} />
      <FixturesSection groupMatches={groupMatches} onReload={onReload} />
      <BonusQuestionsSection bonusQuestions={bonusQuestions} knockoutRounds={knockoutRounds} onReload={onReload} />
    </div>
  );
}
