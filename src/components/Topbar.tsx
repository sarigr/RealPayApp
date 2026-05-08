import type { AppTheme } from '../types';

type TopbarProps = {
  email: string;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onLogout: () => Promise<void>;
};

const themeOptions: Array<{ value: AppTheme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'starwars', label: 'Star Wars' },
  { value: 'lotr', label: 'Lord of the Rings' },
];

export function Topbar({ email, theme, onThemeChange, onLogout }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand-area">
        <h1>RealPayApp</h1>
        <p>Κοινά έξοδα Θανάση & Σοφίας</p>
      </div>

      <div className="user-area">
        <label className="theme-switcher">
          <span>Theme</span>
          <select
            className="theme-select"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as AppTheme)}
          >
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <span className="user-email">{email}</span>
        <button type="button" onClick={onLogout} className="secondary-button">
          Αποσύνδεση
        </button>
      </div>
    </header>
  );
}
