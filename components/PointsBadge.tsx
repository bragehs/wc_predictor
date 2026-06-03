interface PointsBadgeProps {
  pts: number;
}

export default function PointsBadge({ pts }: PointsBadgeProps) {
  const on = pts > 0;
  return (
    <div style={{ width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:on?"#f9731620":"#ffffff08",color:on?"#f97316":"#444",border:`1px solid ${on?"#f9731640":"#1c1c2c"}`,flexShrink:0 }}>
      +{pts}
    </div>
  );
}
