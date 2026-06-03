import type { ReactNode } from "react";

interface STitleProps {
  children: ReactNode;
}

export default function STitle({ children }: STitleProps) {
  return (
    <div style={{ fontSize:15,fontWeight:900,letterSpacing:2,textTransform:"uppercase",color:"#f97316",marginBottom:14,borderBottom:"1px solid #181828",paddingBottom:6 }}>
      {children}
    </div>
  );
}
