import { useTournament } from "../context/TournamentContext";
import { useGame } from "../context/GameContext";
import STitle from "../components/STitle";
import GroupDayView from "./live/GroupDayView";
import KnockoutSurvivalView from "./live/KnockoutSurvivalView";

// Returns [start, end] of "today" in Oslo time (CEST, UTC+2).
// End extends to 03:00 the next morning to capture late-night kickoffs.

const extraHoursDisplay = 6;

function getTodayWindow(): [Date, Date] {
  const now = new Date();
  const osloDateStr = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const [y, m, d] = osloDateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - 2 * 3600000);
  const end   = new Date(Date.UTC(y, m - 1, d + 1, extraHoursDisplay) - 2 * 3600000);
  return [start, end];
}

export default function LiveTab() {
  const { groupMatches, knockoutRounds, matchDates } = useTournament();
  const { results } = useGame();

  const [todayStart, todayEnd] = getTodayWindow();

  const allGroupDone = groupMatches.every(m => {
    const r = results.matchResults[m.id];
    return r && r.home !== "" && r.away !== "" && r.home != null && r.away != null;
  });

  const firstKODate = knockoutRounds
    .flatMap(r => r.matchIds)
    .map(id => matchDates[id])
    .filter(Boolean)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const knockoutMode = allGroupDone && firstKODate !== null && todayStart >= firstKODate;

  return (
    <div>
      <STitle>{knockoutMode ? "Knockout" : "Today's Matches"}</STitle>
      {knockoutMode ? <KnockoutSurvivalView /> : <GroupDayView todayStart={todayStart} todayEnd={todayEnd} />}
    </div>
  );
}
