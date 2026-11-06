import React from 'react';

export type HubTab = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type Props = {
  tabs: HubTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

/** Tabs reutilizables para hubs de menú consolidados */
const HubTabs: React.FC<Props> = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex flex-wrap gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 w-fit ${className}`}>
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const selected = active === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selected
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default HubTabs;
