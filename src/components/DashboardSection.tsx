import type { Totals } from '../types';
import { formatMoney } from '../utils/helpers';

type DashboardSectionProps = {
  totals: Totals;
};

type DashboardMetricRowProps = {
  label: string;
  value: number;
  showDebtColor?: boolean;
};

function getDebtClass(value: number) {
  if (value > 0) return ' debt-positive';
  if (value < 0) return ' debt-negative';
  return '';
}

function DashboardMetricRow({ label, value, showDebtColor = false }: DashboardMetricRowProps) {
  const valueClassName = `dashboard-metric-value${showDebtColor ? getDebtClass(value) : ''}`;

  return (
    <div className="dashboard-metric-row">
      <span className="dashboard-metric-label">{label}</span>
      <strong className={valueClassName}>{formatMoney(value)}</strong>
    </div>
  );
}

function getDebtSummaryMessage(finalThanasisDebt: number) {
  const absoluteDebt = Math.abs(finalThanasisDebt);

  if (finalThanasisDebt > 0.01) {
    return `Ο Θανάσης χρωστάει στη Σοφία ${formatMoney(absoluteDebt)}.`;
  }

  if (finalThanasisDebt < -0.01) {
    return `Η Σοφία χρωστάει στον Θανάση ${formatMoney(absoluteDebt)}.`;
  }

  return 'Τα χρέη είναι ισορροπημένα. Κανείς δεν χρωστάει κανέναν.';
}

function DashboardResultRow({ message }: { message: string }) {
  return (
    <div className="dashboard-metric-row">
      <span className="dashboard-metric-label">Τελικό καθαρό αποτέλεσμα</span>
      <strong className="dashboard-metric-value dashboard-result-message">{message}</strong>
    </div>
  );
}

export function DashboardSection({ totals }: DashboardSectionProps) {
  const debtSummaryMessage = getDebtSummaryMessage(totals.finalThanasisDebt);

  return (
    <section className="dashboard-section">
      <div className="dashboard-groups">
        <section className="dashboard-group-card">
          <div className="dashboard-group-header">
            <h2>Κοινά έξοδα</h2>
          </div>

          <div className="dashboard-metric-list">
            <DashboardMetricRow label="Σύνολο κοινών εξόδων" value={totals.totalAll} />
            <DashboardMetricRow label="Δίκαιο μερίδιο καθενός" value={totals.fairShare} />
            <DashboardMetricRow label="Πλήρωσε Θανάσης" value={totals.totalThanasis} />
            <DashboardMetricRow label="Πλήρωσε Σοφία" value={totals.totalSofia} />
          </div>
        </section>

        <section className="dashboard-group-card">
          <div className="dashboard-group-header">
            <h2>Χρέη</h2>
          </div>

          <div className="dashboard-metric-list">
            <DashboardMetricRow
              label="Χρέος Θανάση από κοινά"
              value={totals.baseThanasisDebt}
              showDebtColor
            />
            <DashboardMetricRow
              label="Χρέος Σοφίας από κοινά"
              value={totals.baseSofiaDebt}
              showDebtColor
            />
            <DashboardResultRow message={debtSummaryMessage} />
          </div>
        </section>

        <section className="dashboard-group-card">
          <div className="dashboard-group-header">
            <h2>Προσωπικά έξοδα</h2>
          </div>

          <div className="dashboard-metric-list">
            <DashboardMetricRow label="Προσωπικά Θανάση" value={totals.personalThanasisTotal} />
            <DashboardMetricRow label="Προσωπικά Σοφίας" value={totals.personalSofiaTotal} />
          </div>
        </section>
      </div>
    </section>
  );
}
