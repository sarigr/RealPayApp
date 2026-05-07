import type { Totals } from '../types';
import { formatMoney } from '../utils/helpers';

type StatsGridProps = {
  totals: Totals;
};

export function StatsGrid({ totals }: StatsGridProps) {
  return (
    <section className="stats-grid">
      <div className="stat-card">
        <span>Σύνολο κοινών εξόδων</span>
        <strong>{formatMoney(totals.totalAll)}</strong>
      </div>

      <div className="stat-card">
        <span>Σύνολο Θανάση</span>
        <strong>{formatMoney(totals.totalThanasis)}</strong>
      </div>

      <div className="stat-card">
        <span>Σύνολο Σοφίας</span>
        <strong>{formatMoney(totals.totalSofia)}</strong>
      </div>

      <div className="stat-card">
        <span>Δίκαιο μερίδιο καθενός</span>
        <strong>{formatMoney(totals.fairShare)}</strong>
      </div>

      <div className="stat-card">
        <span>Χρέος Θανάση από κοινά</span>
        <strong className={totals.baseThanasisDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.baseThanasisDebt)}
        </strong>
      </div>

      <div className="stat-card">
        <span>Χρέος Σοφίας από κοινά</span>
        <strong className={totals.baseSofiaDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.baseSofiaDebt)}
        </strong>
      </div>

      <div className="stat-card">
        <span>Έξτρα χρέος Θανάση</span>
        <strong className={totals.extraThanasisDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.extraThanasisDebt)}
        </strong>
      </div>

      <div className="stat-card">
        <span>Έξτρα χρέος Σοφίας</span>
        <strong className={totals.extraSofiaDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.extraSofiaDebt)}
        </strong>
      </div>

      <div className="stat-card important-stat">
        <span>Τελικό χρέος Θανάση</span>
        <strong className={totals.finalThanasisDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.finalThanasisDebt)}
        </strong>
      </div>

      <div className="stat-card important-stat">
        <span>Τελικό χρέος Σοφίας</span>
        <strong className={totals.finalSofiaDebt > 0 ? 'debt-positive' : 'debt-negative'}>
          {formatMoney(totals.finalSofiaDebt)}
        </strong>
      </div>

      <div className="stat-card">
        <span>Προσωπικά Θανάση</span>
        <strong>{formatMoney(totals.personalThanasisTotal)}</strong>
      </div>

      <div className="stat-card">
        <span>Προσωπικά Σοφίας</span>
        <strong>{formatMoney(totals.personalSofiaTotal)}</strong>
      </div>
    </section>
  );
}