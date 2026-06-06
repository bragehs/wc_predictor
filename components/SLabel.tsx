import { THEME } from "../theme";

interface SLabelProps {
  children: React.ReactNode;
  color?: string;
  mb?: number;
}

export default function SLabel({ children, color = THEME.textFaint, mb = 6 }: SLabelProps) {
  return (
    <div style={{
      fontSize: 10,
      color,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: mb,
    }}>
      {children}
    </div>
  );
}
