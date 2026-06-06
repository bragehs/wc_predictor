import { THEME } from "../theme";

interface SetupSectionProps {
  title: string;
  children: React.ReactNode;
  titleColor?: string;
  borderColor?: string;
}

export default function SetupSection({ title, children, titleColor, borderColor }: SetupSectionProps) {
  return (
    <div style={{
      background: THEME.bgCard,
      border: `1px solid ${borderColor ?? THEME.borderCard}`,
      borderRadius: 8,
      padding: "14px 16px",
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 10,
        color: titleColor ?? THEME.textMuted,
        letterSpacing: 1,
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
