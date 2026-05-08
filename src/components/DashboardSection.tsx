import type { Totals } from '../types';
import { formatMoney } from '../utils/helpers';
import { usePersistentState } from '../hooks/usePersistentState';

type DashboardSectionProps = {
  totals: Totals;
};

type DashboardMetricRowProps = {
  label: string;
  value: number;
  showDebtColor?: boolean;
};

type DebtDetailRowProps = {
  label: string;
  value: number;
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

function DebtDetailRow({ label, value }: DebtDetailRowProps) {
  return (
    <div className="debt-detail-row">
      <span className="debt-detail-label">{label}</span>
      <strong className={`debt-detail-value${getDebtClass(value)}`}>
        {formatMoney(value)}
      </strong>
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

export function DashboardSection({ totals }: DashboardSectionProps) {
  const [showDebtDetails, setShowDebtDetails] = usePersistentState<boolean>(
    'realpayapp-dashboard-show-debt-details',
    false,
    (value): value is boolean => typeof value === 'boolean'
  );
  const debtSummaryMessage = getDebtSummaryMessage(totals.finalThanasisDebt);
  const debtResultClassName = `debt-result-amount${getDebtClass(totals.finalThanasisDebt)}`;

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

          <div className="debt-result-card">
            <div className="debt-result-main">
              <span>Τελικό καθαρό αποτέλεσμα</span>
              <strong>{debtSummaryMessage}</strong>
            </div>

            <strong className={debtResultClassName}>
              {formatMoney(Math.abs(totals.finalThanasisDebt))}
            </strong>
          </div>

          <button
            type="button"
            className="details-toggle-button"
            aria-expanded={showDebtDetails}
            onClick={() => setShowDebtDetails((currentValue) => !currentValue)}
          >
            Λεπτομέρειες
          </button>

          {showDebtDetails && (
            <div className="debt-details-panel">
              <DebtDetailRow label="Χρέος Θανάση από κοινά" value={totals.baseThanasisDebt} />
              <DebtDetailRow label="Χρέος Σοφίας από κοινά" value={totals.baseSofiaDebt} />
              <DebtDetailRow label="Έξτρα χρέος Θανάση" value={totals.extraThanasisDebt} />
              <DebtDetailRow label="Έξτρα χρέος Σοφίας" value={totals.extraSofiaDebt} />
              <DebtDetailRow
                label="Τελικό καθαρό χρέος Θανάση"
                value={totals.finalThanasisDebt}
              />
              <DebtDetailRow
                label="Τελικό καθαρό χρέος Σοφίας"
                value={totals.finalSofiaDebt}
              />

              <p className="debt-details-note">
                Το τελικό καθαρό αποτέλεσμα προκύπτει με συμψηφισμό των κοινών εξόδων
                και των έξτρα χρεών.
              </p>
              <p className="debt-details-note">
                Θετικό ποσό στον Θανάση σημαίνει ότι ο Θανάσης χρωστάει στη Σοφία.
                Αρνητικό ποσό σημαίνει ότι η Σοφία χρωστάει στον Θανάση.
              </p>
            </div>
          )}
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
