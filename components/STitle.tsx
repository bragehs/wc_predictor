import type { ReactNode } from "react";
import { THEME } from "../theme";

interface STitleProps {
  children: ReactNode;
}

export default function STitle({ children }: STitleProps) {
  return (
    <div style={{ fontSize:15,fontWeight:900,letterSpacing:2,textTransform:"uppercase",color:THEME.gold,marginBottom:14,borderBottom:`1px solid ${THEME.borderMuted}`,paddingBottom:6 }}>
      {children}
    </div>
  );
}
