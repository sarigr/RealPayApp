import type { Totals } from '../types';
import { formatMoney } from '../utils/helpers';
import { StatsGrid } from './StatsGrid';

type DashboardSectionProps = {
  totals: Totals;
};

function getSettlementInfo(totals: Totals) {
  const difference = totals.finalThanasisDebt - totals.finalSofiaDebt;

  if (Math.abs(difference) < 0.01) {
    return {
      title: 'Τα τελικά χρέη είναι ισορροπημένα.',
      message: 'Δεν χρειάζεται διακανονισμός αυτή τη στιγμή.',
      amount: 0,
    };
  }

  if (difference > 0) {
    const amount = difference / 2;

    return {
      title: 'Ο Θανάσης έχει μεγαλύτερο τελικό χρέος.',
      message: `Ο Θανάσης πρέπει να δώσει ${formatMoney(amount)} στη Σοφία.`,
      amount,
    };
  }

  const amount = Math.abs(difference) / 2;

  return {
    title: 'Η Σοφία έχει μεγαλύτερο τελικό χρέος.',
    message: `Η Σοφία πρέπει να δώσει ${formatMoney(amount)} στον Θανάση.`,
    amount,
  };
}

export function DashboardSection({ totals }: DashboardSectionProps) {
  const settlement = getSettlementInfo(totals);

  return (
    <section className="dashboard-section">
      <StatsGrid totals={totals} />

      <section className="settlement-card">
        <div>
          <span className="settlement-main">Διακανονισμός</span>
          <h2>{settlement.title}</h2>
          <p>{settlement.message}</p>
        </div>

        <strong className="settlement-amount">{formatMoney(settlement.amount)}</strong>
      </section>

      <section className="dashboard-explanation">
        <h2>Πώς διαβάζονται οι αριθμοί</h2>
        <p>
          Τα κοινά έξοδα μοιράζονται στη μέση. Από εκεί αφαιρείται ό,τι έχει ήδη
          πληρώσει ο καθένας και μετά προστίθενται τα έξτρα χρέη. Ο διακανονισμός
          είναι η μισή διαφορά ανάμεσα στα δύο τελικά χρέη.
        </p>

        <div className="mini-summary-grid">
          <div className="mini-summary-item">
            <span>Κοινά έξοδα</span>
            <strong>{formatMoney(totals.totalAll)}</strong>
          </div>

          <div className="mini-summary-item">
            <span>Δίκαιο μερίδιο</span>
            <strong>{formatMoney(totals.fairShare)}</strong>
          </div>

          <div className="mini-summary-item">
            <span>Τελικό χρέος Θανάση</span>
            <strong>{formatMoney(totals.finalThanasisDebt)}</strong>
          </div>

          <div className="mini-summary-item">
            <span>Τελικό χρέος Σοφίας</span>
            <strong>{formatMoney(totals.finalSofiaDebt)}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
