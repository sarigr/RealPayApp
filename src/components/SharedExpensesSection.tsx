import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { HouseholdInfo, SharedCategory, SharedExpense } from '../types';
import { exportSharedExpensesToCsv } from '../utils/csv';
import { formatMoney, getTodayDate } from '../utils/helpers';

type SharedExpensesSectionProps = {
  householdInfo: HouseholdInfo | null;
  sharedCategories: SharedCategory[];
  sharedExpenses: SharedExpense[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

export function SharedExpensesSection({
  householdInfo,
  sharedCategories,
  sharedExpenses,
  onDataChanged,
  setMessage,
}: SharedExpensesSectionProps) {
  const [savingExpense, setSavingExpense] = useState(false);

  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [categoryId, setCategoryId] = useState('');
  const [thanasisAmount, setThanasisAmount] = useState('');
  const [sofiaAmount, setSofiaAmount] = useState('');
  const [note, setNote] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterNote, setFilterNote] = useState('');

  const filteredSharedExpenses = useMemo(() => {
    const noteQuery = filterNote.trim().toLocaleLowerCase('el-GR');

    return sharedExpenses.filter((expense) => {
      const matchesMonth = !filterMonth || expense.expense_date.slice(0, 7) === filterMonth;
      const matchesCategory = !filterCategoryId || expense.category_id === filterCategoryId;
      const noteText = (expense.note ?? '').toLocaleLowerCase('el-GR');
      const matchesNote = !noteQuery || noteText.includes(noteQuery);

      return matchesMonth && matchesCategory && matchesNote;
    });
  }, [filterCategoryId, filterMonth, filterNote, sharedExpenses]);

  useEffect(() => {
    if (!categoryId && sharedCategories.length > 0) {
      setCategoryId(sharedCategories[0].id);
    }
  }, [categoryId, sharedCategories]);

  async function handleAddSharedExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household.');
      return;
    }

    if (!categoryId) {
      setMessage('Διάλεξε κατηγορία.');
      return;
    }

    const thanasisValue = Number(thanasisAmount || 0);
    const sofiaValue = Number(sofiaAmount || 0);

    if (Number.isNaN(thanasisValue) || Number.isNaN(sofiaValue)) {
      setMessage('Βάλε σωστά ποσά.');
      return;
    }

    if (thanasisValue < 0 || sofiaValue < 0) {
      setMessage('Τα ποσά δεν μπορούν να είναι αρνητικά.');
      return;
    }

    if (thanasisValue === 0 && sofiaValue === 0) {
      setMessage('Βάλε ποσό στον Θανάση ή στη Σοφία.');
      return;
    }

    setSavingExpense(true);
    setMessage('');

    const { error } = await supabase.from('shared_expenses').insert({
      household_id: householdInfo.household_id,
      expense_date: expenseDate,
      category_id: categoryId,
      thanasis_amount: thanasisValue,
      sofia_amount: sofiaValue,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(`Σφάλμα αποθήκευσης: ${error.message}`);
      setSavingExpense(false);
      return;
    }

    setThanasisAmount('');
    setSofiaAmount('');
    setNote('');
    setExpenseDate(getTodayDate());

    await onDataChanged();

    setMessage('Το κοινό έξοδο αποθηκεύτηκε.');
    setSavingExpense(false);
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!householdInfo) return;

    const confirmDelete = window.confirm('Να διαγραφεί αυτή η καταχώρηση;');

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('shared_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('household_id', householdInfo.household_id);

    if (error) {
      setMessage(`Σφάλμα διαγραφής: ${error.message}`);
      return;
    }

    await onDataChanged();
    setMessage('Η καταχώρηση διαγράφηκε.');
  }

  function clearFilters() {
    setFilterMonth('');
    setFilterCategoryId('');
    setFilterNote('');
  }

  return (
    <section className="layout-grid">
      <section className="card">
        <h2>Νέο κοινό έξοδο</h2>

        <form onSubmit={handleAddSharedExpense} className="form">
          <label>
            Ημερομηνία
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
            />
          </label>

          <label>
            Κατηγορία
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              {sharedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="two-columns">
            <label>
              Θανάσης
              <input
                type="number"
                min="0"
                step="0.01"
                value={thanasisAmount}
                onChange={(event) => setThanasisAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <label>
              Σοφία
              <input
                type="number"
                min="0"
                step="0.01"
                value={sofiaAmount}
                onChange={(event) => setSofiaAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="calculated-total">
            Σύνολο φόρμας:{' '}
            <strong>
              {formatMoney(Number(thanasisAmount || 0) + Number(sofiaAmount || 0))}
            </strong>
          </div>

          <label>
            Σημείωση
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="π.χ. Σκλαβενίτης, ΔΕΗ, βενζίνη"
            />
          </label>

          <button type="submit" disabled={savingExpense || !categoryId}>
            {savingExpense ? 'Αποθήκευση...' : 'Αποθήκευση εξόδου'}
          </button>
        </form>
      </section>

      <section className="card table-card">
        <div className="section-title">
          <h2>Πίνακας κοινών εξόδων</h2>
          <span>{sharedExpenses.length} καταχωρήσεις</span>
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
              Κατηγορία
              <select
                value={filterCategoryId}
                onChange={(event) => setFilterCategoryId(event.target.value)}
              >
                <option value="">Όλες οι κατηγορίες</option>
                {sharedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Αναζήτηση σημείωσης
              <input
                type="text"
                value={filterNote}
                onChange={(event) => setFilterNote(event.target.value)}
                placeholder="π.χ. ΔΕΗ, βενζίνη"
              />
            </label>
          </div>

          <div className="filter-actions">
            <button type="button" className="clear-filters-button" onClick={clearFilters}>
              Καθαρισμός φίλτρων
            </button>
          </div>
        </div>

        <div className="table-toolbar">
          <span className="muted-count">
            Εμφάνιση {filteredSharedExpenses.length} από {sharedExpenses.length} καταχωρήσεις
          </span>
          <button
            type="button"
            className="export-button"
            disabled={filteredSharedExpenses.length === 0}
            onClick={() => exportSharedExpensesToCsv(filteredSharedExpenses)}
          >
            Export CSV
          </button>
        </div>

        {sharedExpenses.length === 0 ? (
          <p className="empty-text">Δεν υπάρχουν ακόμα κοινά έξοδα.</p>
        ) : filteredSharedExpenses.length === 0 ? (
          <p className="empty-text">Δεν βρέθηκαν κοινά έξοδα με αυτά τα φίλτρα.</p>
        ) : (
          <>
            <div className="table-wrapper data-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ημερομηνία</th>
                    <th>Κατηγορία</th>
                    <th>Θανάσης</th>
                    <th>Σοφία</th>
                    <th>Σύνολο</th>
                    <th>Σημείωση</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSharedExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.expense_date}</td>
                      <td>{expense.shared_categories?.name ?? 'Χωρίς κατηγορία'}</td>
                      <td>{formatMoney(Number(expense.thanasis_amount))}</td>
                      <td>{formatMoney(Number(expense.sofia_amount))}</td>
                      <td>{formatMoney(Number(expense.total_amount))}</td>
                      <td>{expense.note ?? '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteExpense(expense.id)}
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
              {filteredSharedExpenses.map((expense) => (
                <article className="mobile-record-card" key={expense.id}>
                  <div className="mobile-record-header">
                    <strong>{expense.shared_categories?.name ?? 'Χωρίς κατηγορία'}</strong>
                    <span>{expense.expense_date}</span>
                  </div>

                  <dl className="mobile-record-details">
                    <div>
                      <dt>Θανάσης</dt>
                      <dd>{formatMoney(Number(expense.thanasis_amount))}</dd>
                    </div>
                    <div>
                      <dt>Σοφία</dt>
                      <dd>{formatMoney(Number(expense.sofia_amount))}</dd>
                    </div>
                    <div>
                      <dt>Σύνολο</dt>
                      <dd>{formatMoney(Number(expense.total_amount))}</dd>
                    </div>
                    <div>
                      <dt>Σημείωση</dt>
                      <dd>{expense.note ?? '-'}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="danger-button mobile-delete-button"
                    onClick={() => handleDeleteExpense(expense.id)}
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
