import { THEME } from "../theme";

type BannerColor = "blue" | "green" | "gold";

const palette: Record<BannerColor, { bg: string; border: string; text: string }> = {
  blue:  { bg: THEME.bgCard,   border: THEME.blueBorder,   text: THEME.blue  },
  green: { bg: THEME.bgCard,   border: THEME.greenBorder,  text: THEME.green },
  gold:  { bg: THEME.bgCard,   border: THEME.goldBorder,   text: THEME.gold  },
};

interface StatusBannerProps {
  color: BannerColor;
  children: React.ReactNode;
  mb?: number;
}

export default function StatusBanner({ color, children, mb = 14 }: StatusBannerProps) {
  const p = palette[color];
  return (
    <div style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: mb,
      fontSize: 13,
      color: p.text,
      fontFamily: "'Barlow', Arial",
    }}>
      {children}
    </div>
  );
}
