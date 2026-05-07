import type { AppTab } from '../types';

type AppNavigationProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'shared', label: 'Κοινά' },
  { id: 'personal', label: 'Προσωπικά' },
  { id: 'categories', label: 'Κατηγορίες' },
  { id: 'reports', label: 'Αναφορές' },
];

export function AppNavigation({ activeTab, onTabChange }: AppNavigationProps) {
  return (
    <nav className="app-navigation" aria-label="Κύρια πλοήγηση">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
          aria-pressed={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
