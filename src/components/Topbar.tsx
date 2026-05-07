type TopbarProps = {
  email: string;
  onLogout: () => Promise<void>;
};

export function Topbar({ email, onLogout }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand-area">
        <h1>RealPayApp</h1>
        <p>Κοινά έξοδα Θανάση & Σοφίας</p>
      </div>

      <div className="user-area">
        <span className="user-email">{email}</span>
        <button type="button" onClick={onLogout} className="secondary-button">
          Αποσύνδεση
        </button>
      </div>
    </header>
  );
}
