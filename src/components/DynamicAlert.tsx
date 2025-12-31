import React from 'react';
import { auditUI } from '../analytics/audit';

export interface DynamicAlertItem {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  desc?: string;
  actionText?: string;
  onAction?: () => void;
}

const colorMap: Record<DynamicAlertItem['type'], string> = {
  info: 'bg-info bg-opacity-10 text-info',
  warning: 'bg-warning bg-opacity-10 text-warning',
  danger: 'bg-danger bg-opacity-10 text-danger',
  success: 'bg-success bg-opacity-10 text-success',
};

export const DynamicAlert: React.FC<{ items: DynamicAlertItem[]; className?: string }> = ({ items, className }) => {
  if (!items?.length) return null;
  return (
    <div className={className}>
      {items.map(item => (
        <div key={item.id} className={`flex items-start justify-between p-3 rounded-lg mb-2 ${colorMap[item.type]} border border-border-light`}>
          <div className="pr-3">
            <div className="text-sm font-medium">{item.title}</div>
            {item.desc && <div className="text-xs opacity-80 mt-0.5">{item.desc}</div>}
          </div>
          {item.actionText && (
            <button
              className="text-xs underline"
              onClick={() => { auditUI('dynamic_alert_action', { id: item.id }); item.onAction?.(); }}
            >
              {item.actionText}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default DynamicAlert;
