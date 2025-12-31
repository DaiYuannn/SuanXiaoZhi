import React from 'react';

export interface DualAxisProgressProps {
  primaryLabel: string;      // 主进度名称
  primaryPercent: number;    // 主进度百分比 0-100
  secondaryLabel: string;    // 次进度名称
  secondaryPercent: number;  // 次进度百分比 0-100
  thresholds?: number[];     // 阈值刻度 (0-100)
  className?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export const DualAxisProgress: React.FC<DualAxisProgressProps> = ({
  primaryLabel,
  primaryPercent,
  secondaryLabel,
  secondaryPercent,
  thresholds = [25, 50, 75],
  className
}) => {
  const p = clamp(primaryPercent);
  const s = clamp(secondaryPercent);
  return (
    <div className={"space-y-3 " + (className || '')}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{primaryLabel}</span>
        <span className="text-gray-500">{p.toFixed(1)}%</span>
      </div>
      <div className="relative h-4 bg-gray-200 rounded overflow-hidden">
        <div className="absolute inset-0 flex">
          {thresholds.map(t => (
            <div key={t} style={{ left: `${t}%` }} className="absolute top-0 h-full w-px bg-white/70" />
          ))}
        </div>
        <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${p}%` }} />
        <div
          className="absolute inset-y-0 bg-secondary/60 mix-blend-multiply"
          style={{ width: `${s}%` }}
        />
        <div className="absolute inset-0 flex items-center">
          <div
            className="h-4 w-px bg-secondary shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
            style={{ marginLeft: `${s}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{secondaryLabel}</span>
        <span>{s.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default DualAxisProgress;
