import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { ExtraDebt, HouseholdInfo, PersonKey } from '../types';
import { exportExtraDebtsToCsv } from '../utils/csv';
import { formatMoney, formatPerson, getTodayDate } from '../utils/helpers';

type ExtraDebtsSectionProps = {
  householdInfo: HouseholdInfo | null;
  extraDebts: ExtraDebt[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

type DebtPersonFilter = PersonKey | 'all';

function getAmountClass(value: number) {
  if (value > 0) return ' debt-positive';
  if (value < 0) return ' debt-negative';
  return '';
}

export function ExtraDebtsSection({
  householdInfo,
  extraDebts,
  onDataChanged,
  setMessage,
}: ExtraDebtsSectionProps) {
  const [savingDebt, setSavingDebt] = useState(false);

  const [debtDate, setDebtDate] = useState(getTodayDate());
  const [debtPerson, setDebtPerson] = useState<PersonKey>('thanasis');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtReason, setDebtReason] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPerson, setFilterPerson] = useState<DebtPersonFilter>('all');
  const [filterReason, setFilterReason] = useState('');

  const filteredExtraDebts = useMemo(() => {
    const reasonQuery = filterReason.trim().toLocaleLowerCase('el-GR');

    return extraDebts.filter((debt) => {
      const matchesMonth = !filterMonth || debt.debt_date.slice(0, 7) === filterMonth;
      const matchesPerson = filterPerson === 'all' || debt.person_key === filterPerson;
      const reasonText = (debt.reason ?? '').toLocaleLowerCase('el-GR');
      const matchesReason = !reasonQuery || reasonText.includes(reasonQuery);

      return matchesMonth && matchesPerson && matchesReason;
    });
  }, [extraDebts, filterMonth, filterPerson, filterReason]);

  const filteredExtraTotals = useMemo(() => {
    const filteredExtraThanasisTotal = filteredExtraDebts
      .filter((debt) => debt.person_key === 'thanasis')
      .reduce((sum, debt) => sum + Number(debt.amount), 0);
    const filteredExtraSofiaTotal = filteredExtraDebts
      .filter((debt) => debt.person_key === 'sofia')
      .reduce((sum, debt) => sum + Number(debt.amount), 0);

    return {
      filteredExtraThanasisTotal,
      filteredExtraSofiaTotal,
      filteredExtraNet: filteredExtraThanasisTotal - filteredExtraSofiaTotal,
    };
  }, [filteredExtraDebts]);

  async function handleAddExtraDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household.');
      return;
    }

    const amountValue = Number(debtAmount || 0);

    if (Number.isNaN(amountValue)) {
      setMessage('Βάλε σωστό ποσό για το έξτρα χρέος.');
      return;
    }

    if (amountValue === 0) {
      setMessage('Βάλε ποσό για το έξτρα χρέος.');
      return;
    }

    setSavingDebt(true);
    setMessage('');

    const { error } = await supabase.from('extra_debts').insert({
      household_id: householdInfo.household_id,
      person_key: debtPerson,
      debt_date: debtDate,
      amount: amountValue,
      reason: debtReason.trim() || null,
    });

    if (error) {
      setMessage(`Σφάλμα αποθήκευσης έξτρα χρέους: ${error.message}`);
      setSavingDebt(false);
      return;
    }

    setDebtDate(getTodayDate());
    setDebtAmount('');
    setDebtReason('');

    await onDataChanged();

    setMessage('Το έξτρα χρέος αποθηκεύτηκε.');
    setSavingDebt(false);
  }

  async function handleDeleteDebt(debtId: string) {
    if (!householdInfo) return;

    const confirmDelete = window.confirm('Να διαγραφεί αυτό το έξτρα χρέος;');

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('extra_debts')
      .delete()
      .eq('id', debtId)
      .eq('household_id', householdInfo.household_id);

    if (error) {
      setMessage(`Σφάλμα διαγραφής έξτρα χρέους: ${error.message}`);
      return;
    }

    await onDataChanged();
    setMessage('Το έξτρα χρέος διαγράφηκε.');
  }

  function clearFilters() {
    setFilterMonth('');
    setFilterPerson('all');
    setFilterReason('');
  }

  return (
    <section className="section-flow bottom-grid">
      <section className="card section-form-card compact-form-card">
        <h2 className="compact-form-title">Νέο έξτρα χρέος</h2>

        <form onSubmit={handleAddExtraDebt} className="form compact-form">
          <div className="compact-form-grid">
            <label>
              Ημερομηνία
              <input
                type="date"
                value={debtDate}
                onChange={(event) => setDebtDate(event.target.value)}
                required
              />
            </label>

            <label>
              Άτομο
              <select
                value={debtPerson}
                onChange={(event) => setDebtPerson(event.target.value as PersonKey)}
                required
              >
                <option value="thanasis">Θανάσης</option>
                <option value="sofia">Σοφία</option>
              </select>
            </label>

            <label>
              Ποσό
              <input
                type="number"
                step="0.01"
                value={debtAmount}
                onChange={(event) => setDebtAmount(event.target.value)}
                placeholder="π.χ. 15 ή -15"
                required
              />
              <span className="compact-form-hint">
                Θετικό ποσό: χρωστάει παραπάνω. Αρνητικό: πίστωση/έχει βάλει παραπάνω.
              </span>
            </label>

            <label>
              Αιτία
              <input
                type="text"
                value={debtReason}
                onChange={(event) => setDebtReason(event.target.value)}
                placeholder="π.χ. παλιό χρέος, μετρητά, επιστροφή"
              />
            </label>

            <div className="compact-form-actions">
              <button type="submit" disabled={savingDebt}>
                {savingDebt ? 'Αποθήκευση...' : 'Αποθήκευση έξτρα χρέους'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card table-card section-table-card">
        <div className="section-title">
          <h2>Πίνακας έξτρα χρεών</h2>
          <span>{extraDebts.length} καταχωρήσεις</span>
        </div>

        <div className="filters-panel">
          <div className="filters-grid">
            <label>
              Μήνας
              <input
                type="month"
                value={filterMonth}
                onChange={(event) => setFilterMonth(event.target.value)}
              />
            </label>

            <label>
              Άτομο
              <select
                value={filterPerson}
                onChange={(event) => setFilterPerson(event.target.value as DebtPersonFilter)}
              >
                <option value="all">Όλοι</option>
                <option value="thanasis">Θανάσης</option>
                <option value="sofia">Σοφία</option>
              </select>
            </label>

            <label>
              Αναζήτηση αιτίας
              <input
                type="text"
                value={filterReason}
                onChange={(event) => setFilterReason(event.target.value)}
                placeholder="π.χ. μετρητά, επιστροφή"
              />
            </label>
          </div>

          <div className="filter-actions">
            <button type="button" className="clear-filters-button" onClick={clearFilters}>
              Καθαρισμός φίλτρων
            </button>
          </div>
        </div>

        <section className="filtered-summary-panel">
          <h3>Σύνολα φιλτραρισμένων έξτρα χρεών</h3>
          <div className="filtered-summary-grid">
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Θανάσης</span>
              <strong
                className={`filtered-summary-value${getAmountClass(
                  filteredExtraTotals.filteredExtraThanasisTotal
                )}`}
              >
                {formatMoney(filteredExtraTotals.filteredExtraThanasisTotal)}
              </strong>
            </div>
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Σοφία</span>
              <strong
                className={`filtered-summary-value${getAmountClass(
                  filteredExtraTotals.filteredExtraSofiaTotal
                )}`}
              >
                {formatMoney(filteredExtraTotals.filteredExtraSofiaTotal)}
              </strong>
            </div>
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Καθαρή διαφορά</span>
              <strong
                className={`filtered-summary-value${getAmountClass(
                  filteredExtraTotals.filteredExtraNet
                )}`}
              >
                {formatMoney(filteredExtraTotals.filteredExtraNet)}
              </strong>
            </div>
          </div>
        </section>

        <div className="table-toolbar">
          <span className="muted-count">
            Εμφάνιση {filteredExtraDebts.length} από {extraDebts.length} καταχωρήσεις
          </span>
          <button
            type="button"
            className="export-button"
            disabled={filteredExtraDebts.length === 0}
            onClick={() => exportExtraDebtsToCsv(filteredExtraDebts)}
          >
            Export CSV
          </button>
        </div>

        {extraDebts.length === 0 ? (
          <p className="empty-text">Δεν υπάρχουν ακόμα έξτρα χρέη.</p>
        ) : filteredExtraDebts.length === 0 ? (
          <p className="empty-text">Δεν βρέθηκαν έξτρα χρέη με αυτά τα φίλτρα.</p>
        ) : (
          <>
            <div className="table-wrapper data-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ημερομηνία</th>
                    <th>Άτομο</th>
                    <th>Ποσό</th>
                    <th>Αιτία</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExtraDebts.map((debt) => (
                    <tr key={debt.id}>
                      <td>{debt.debt_date}</td>
                      <td>{formatPerson(debt.person_key)}</td>
                      <td className={Number(debt.amount) > 0 ? 'debt-positive' : 'debt-negative'}>
                        {formatMoney(Number(debt.amount))}
                      </td>
                      <td>{debt.reason ?? '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteDebt(debt.id)}
                        >
                          Διαγραφή
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-records">
              {filteredExtraDebts.map((debt) => (
                <article className="mobile-record-card" key={debt.id}>
                  <div className="mobile-record-header">
                    <strong>{formatPerson(debt.person_key)}</strong>
                    <span>{debt.debt_date}</span>
                  </div>

                  <dl className="mobile-record-details">
                    <div>
                      <dt>Ποσό</dt>
                      <dd className={Number(debt.amount) > 0 ? 'debt-positive' : 'debt-negative'}>
                        {formatMoney(Number(debt.amount))}
                      </dd>
                    </div>
                    <div>
                      <dt>Αιτία</dt>
                      <dd>{debt.reason ?? '-'}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="danger-button mobile-delete-button"
                    onClick={() => handleDeleteDebt(debt.id)}
                  >
                    Διαγραφή
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
