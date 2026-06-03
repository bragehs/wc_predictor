export const THEME = {
  // Page — soft three-color wash: green → blue → amber (light, not white)
  bgPage:    "linear-gradient(160deg, #d6f5e3 0%, #dbeafe 50%, #fef3c7 100%)",
  bgCard:    "#f8fffe",
  bgCardAlt: "#f4fbff",
  bgInset:   "linear-gradient(135deg, #dcfce7 0%, #dbeafe 100%)",
  bgInput:   "#f0fdf6",
  bgRow:     "#f8fffe",
  bgRowAlt:  "#f0f9ff",
  bgButton:  "linear-gradient(135deg, #dcfce7 0%, #dbeafe 100%)",

  // Header — the bold World Cup splash
  bgHeader:  "linear-gradient(120deg, #16a34a 0%, #1d4ed8 52%, #d97706 100%)",

  // Borders — slightly deeper to show against tinted bg
  borderCard:   "#a8d5be",
  borderMuted:  "#c2dfce",
  borderInput:  "#93c9ac",
  borderFaint:  "#d0ead8",
  borderHeader: "rgba(255,255,255,0.18)",

  // Gold / amber — vivid on white
  gold:         "#d97706",
  goldBg:       "#fef9eb",
  goldBorder:   "#f59e0b88",

  // Green — forest / success
  green:        "#16a34a",
  greenBg:      "#f0fdf4",
  greenBorder:  "#86efac",

  // Blue — sky / results
  blue:         "#2563eb",
  blueBg:       "#eff6ff",
  blueBorder:   "#93c5fd",

  // Red
  red:          "#dc2626",
  redBg:        "#fef2f2",
  redBorder:    "#fca5a5",

  // Purple
  purple:       "#9333ea",
  purpleBg:     "#faf5ff",
  purpleBorder: "#d8b4fe",

  // Text — dark green-tinted hierarchy
  textPrimary:   "#0d2010",
  textSecondary: "#2d5c3c",
  textMuted:     "#6b9678",
  textFaint:     "#b0cfba",

  // On the dark header gradient — always light
  headerText:      "#ffffff",
  headerSubtext:   "#c8f5dc",
  headerMuted:     "rgba(255,255,255,0.55)",
  headerTabActive: "#ffd700",
} as const;
