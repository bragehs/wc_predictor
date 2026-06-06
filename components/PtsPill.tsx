import { THEME } from "../theme";

type PillColor = "blue" | "gold" | "green";

const palette: Record<PillColor, { bg: string; border: string; text: string }> = {
  blue:  { bg: THEME.blueBg,  border: THEME.blueBorder,  text: THEME.blue  },
  gold:  { bg: THEME.goldBg,  border: THEME.goldBorder,  text: THEME.gold  },
  green: { bg: THEME.greenBg, border: THEME.greenBorder, text: THEME.green },
};

interface PtsPillProps {
  pts: number;
  color?: PillColor;
}

export default function PtsPill({ pts, color = "blue" }: PtsPillProps) {
  const p = palette[color];
  return (
    <span style={{
      fontSize: 10,
      background: p.bg,
      color: p.text,
      border: `1px solid ${p.border}`,
      borderRadius: 4,
      padding: "1px 7px",
      fontWeight: 700,
      flexShrink: 0,
    }}>
      +{pts} pts
    </span>
  );
}
