import type { GroupMatch } from "./types/index";

export const FLAGS: Record<string, string> = {
  Mexico: "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", Czechia: "🇨🇿",
  Canada: "🇨🇦", "Bosnia-Herzegovina": "🇧🇦", Qatar: "🇶🇦", Switzerland: "🇨🇭",
  Brazil: "🇧🇷", Morocco: "🇲🇦", Haiti: "🇭🇹", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸", Paraguay: "🇵🇾", Australia: "🇦🇺", Turkey: "🇹🇷",
  Germany: "🇩🇪", "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", Ecuador: "🇪🇨",
  Netherlands: "🇳🇱", Japan: "🇯🇵", Sweden: "🇸🇪", Tunisia: "🇹🇳",
  Belgium: "🇧🇪", Egypt: "🇪🇬", Iran: "🇮🇷", "New Zealand": "🇳🇿",
  Spain: "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", Uruguay: "🇺🇾",
  France: "🇫🇷", Senegal: "🇸🇳", Iraq: "🇮🇶", Norway: "🇳🇴",
  Argentina: "🇦🇷", Algeria: "🇩🇿", Austria: "🇦🇹", Jordan: "🇯🇴",
  Portugal: "🇵🇹", "DR Congo": "🇨🇩", Uzbekistan: "🇺🇿", Colombia: "🇨🇴",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Croatia: "🇭🇷", Ghana: "🇬🇭", Panama: "🇵🇦",
};

export function flag(team: string): string {
  return FLAGS[team] ?? "🌍";
}

export const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const GROUP_MATCHES: GroupMatch[] = [
  // Group A
  { id:"A1", group:"A", home:"Mexico",       away:"South Africa", date:"Jun 11" },
  { id:"A2", group:"A", home:"South Korea",  away:"Czechia",      date:"Jun 11" },
  { id:"A3", group:"A", home:"Mexico",       away:"South Korea",  date:"Jun 18" },
  { id:"A4", group:"A", home:"Czechia",      away:"South Africa", date:"Jun 18" },
  { id:"A5", group:"A", home:"Czechia",      away:"Mexico",       date:"Jun 24" },
  { id:"A6", group:"A", home:"South Africa", away:"South Korea",  date:"Jun 24" },
  // Group B
  { id:"B1", group:"B", home:"Canada",             away:"Bosnia-Herzegovina", date:"Jun 12" },
  { id:"B2", group:"B", home:"Qatar",              away:"Switzerland",        date:"Jun 13" },
  { id:"B3", group:"B", home:"Canada",             away:"Qatar",              date:"Jun 18" },
  { id:"B4", group:"B", home:"Switzerland",        away:"Bosnia-Herzegovina", date:"Jun 18" },
  { id:"B5", group:"B", home:"Switzerland",        away:"Canada",             date:"Jun 24" },
  { id:"B6", group:"B", home:"Bosnia-Herzegovina", away:"Qatar",              date:"Jun 24" },
  // Group C
  { id:"C1", group:"C", home:"Brazil",   away:"Morocco",  date:"Jun 13" },
  { id:"C2", group:"C", home:"Haiti",    away:"Scotland", date:"Jun 13" },
  { id:"C3", group:"C", home:"Brazil",   away:"Haiti",    date:"Jun 19" },
  { id:"C4", group:"C", home:"Scotland", away:"Morocco",  date:"Jun 19" },
  { id:"C5", group:"C", home:"Scotland", away:"Brazil",   date:"Jun 24" },
  { id:"C6", group:"C", home:"Morocco",  away:"Haiti",    date:"Jun 24" },
  // Group D
  { id:"D1", group:"D", home:"USA",       away:"Paraguay", date:"Jun 12" },
  { id:"D2", group:"D", home:"Australia", away:"Turkey",   date:"Jun 13" },
  { id:"D3", group:"D", home:"USA",       away:"Australia",date:"Jun 19" },
  { id:"D4", group:"D", home:"Turkey",    away:"Paraguay", date:"Jun 19" },
  { id:"D5", group:"D", home:"Turkey",    away:"USA",      date:"Jun 25" },
  { id:"D6", group:"D", home:"Paraguay",  away:"Australia",date:"Jun 25" },
  // Group E
  { id:"E1", group:"E", home:"Germany",      away:"Curaçao",      date:"Jun 14" },
  { id:"E2", group:"E", home:"Ivory Coast",  away:"Ecuador",      date:"Jun 14" },
  { id:"E3", group:"E", home:"Germany",      away:"Ivory Coast",  date:"Jun 20" },
  { id:"E4", group:"E", home:"Ecuador",      away:"Curaçao",      date:"Jun 20" },
  { id:"E5", group:"E", home:"Curaçao",      away:"Ivory Coast",  date:"Jun 25" },
  { id:"E6", group:"E", home:"Ecuador",      away:"Germany",      date:"Jun 25" },
  // Group F
  { id:"F1", group:"F", home:"Netherlands", away:"Japan",        date:"Jun 14" },
  { id:"F2", group:"F", home:"Sweden",      away:"Tunisia",      date:"Jun 14" },
  { id:"F3", group:"F", home:"Netherlands", away:"Sweden",       date:"Jun 20" },
  { id:"F4", group:"F", home:"Tunisia",     away:"Japan",        date:"Jun 20" },
  { id:"F5", group:"F", home:"Japan",       away:"Sweden",       date:"Jun 25" },
  { id:"F6", group:"F", home:"Tunisia",     away:"Netherlands",  date:"Jun 25" },
  // Group G
  { id:"G1", group:"G", home:"Belgium",     away:"Egypt",        date:"Jun 15" },
  { id:"G2", group:"G", home:"Iran",        away:"New Zealand",  date:"Jun 15" },
  { id:"G3", group:"G", home:"Belgium",     away:"Iran",         date:"Jun 21" },
  { id:"G4", group:"G", home:"New Zealand", away:"Egypt",        date:"Jun 21" },
  { id:"G5", group:"G", home:"Egypt",       away:"Iran",         date:"Jun 26" },
  { id:"G6", group:"G", home:"New Zealand", away:"Belgium",      date:"Jun 26" },
  // Group H
  { id:"H1", group:"H", home:"Spain",        away:"Cape Verde",   date:"Jun 15" },
  { id:"H2", group:"H", home:"Saudi Arabia", away:"Uruguay",      date:"Jun 15" },
  { id:"H3", group:"H", home:"Spain",        away:"Saudi Arabia", date:"Jun 21" },
  { id:"H4", group:"H", home:"Uruguay",      away:"Cape Verde",   date:"Jun 21" },
  { id:"H5", group:"H", home:"Cape Verde",   away:"Saudi Arabia", date:"Jun 26" },
  { id:"H6", group:"H", home:"Uruguay",      away:"Spain",        date:"Jun 26" },
  // Group I
  { id:"I1", group:"I", home:"France",  away:"Senegal", date:"Jun 16" },
  { id:"I2", group:"I", home:"Iraq",    away:"Norway",  date:"Jun 16" },
  { id:"I3", group:"I", home:"France",  away:"Iraq",    date:"Jun 22" },
  { id:"I4", group:"I", home:"Norway",  away:"Senegal", date:"Jun 22" },
  { id:"I5", group:"I", home:"Norway",  away:"France",  date:"Jun 26" },
  { id:"I6", group:"I", home:"Senegal", away:"Iraq",    date:"Jun 26" },
  // Group J
  { id:"J1", group:"J", home:"Argentina", away:"Algeria",  date:"Jun 16" },
  { id:"J2", group:"J", home:"Austria",   away:"Jordan",   date:"Jun 16" },
  { id:"J3", group:"J", home:"Argentina", away:"Austria",  date:"Jun 22" },
  { id:"J4", group:"J", home:"Jordan",    away:"Algeria",  date:"Jun 22" },
  { id:"J5", group:"J", home:"Jordan",    away:"Argentina",date:"Jun 27" },
  { id:"J6", group:"J", home:"Algeria",   away:"Austria",  date:"Jun 27" },
  // Group K
  { id:"K1", group:"K", home:"Portugal",  away:"DR Congo",   date:"Jun 17" },
  { id:"K2", group:"K", home:"Uzbekistan",away:"Colombia",   date:"Jun 17" },
  { id:"K3", group:"K", home:"Portugal",  away:"Uzbekistan", date:"Jun 23" },
  { id:"K4", group:"K", home:"Colombia",  away:"DR Congo",   date:"Jun 23" },
  { id:"K5", group:"K", home:"Colombia",  away:"Portugal",   date:"Jun 27" },
  { id:"K6", group:"K", home:"DR Congo",  away:"Uzbekistan", date:"Jun 27" },
  // Group L
  { id:"L1", group:"L", home:"England", away:"Croatia", date:"Jun 17" },
  { id:"L2", group:"L", home:"Ghana",   away:"Panama",  date:"Jun 17" },
  { id:"L3", group:"L", home:"England", away:"Ghana",   date:"Jun 23" },
  { id:"L4", group:"L", home:"Panama",  away:"Croatia", date:"Jun 23" },
  { id:"L5", group:"L", home:"Panama",  away:"England", date:"Jun 27" },
  { id:"L6", group:"L", home:"Croatia", away:"Ghana",   date:"Jun 27" },
];
