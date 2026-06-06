import { THEME } from "../theme";

export interface FilterOption {
  key: string;
  label: string;
  activeColor: string;
  activeTextColor?: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  active: string;
  onChange: (key: string) => void;
  mb?: number;
}

export default function FilterBar({ filters, active, onChange, mb = 12 }: FilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: mb }}>
      {filters.map(f => {
        const isActive = active === f.key;
        const textColor = isActive ? (f.activeTextColor ?? "#fff") : THEME.textSecondary;
        return (
          <button
            key={f.key}
            className="grp-btn"
            onClick={() => onChange(f.key)}
            style={{
              background: isActive ? f.activeColor : THEME.bgButton,
              color: textColor,
              border: `1px solid ${isActive ? f.activeColor : THEME.borderCard}`,
              flexShrink: 0,
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
