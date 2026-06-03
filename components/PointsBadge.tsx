import { THEME } from "../theme";

interface PointsBadgeProps {
  pts: number;
}

export default function PointsBadge({ pts }: PointsBadgeProps) {
  const on = pts > 0;
  return (
    <div style={{ width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:on?THEME.goldBg:"#ffffff08",color:on?THEME.gold:THEME.textFaint,border:`1px solid ${on?THEME.goldBorder:THEME.borderFaint}`,flexShrink:0 }}>
      +{pts}
    </div>
  );
}
