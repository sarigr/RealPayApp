import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { HouseholdInfo, PersonKey, PersonalCategory, PersonalExpense } from '../types';
import { exportPersonalExpensesToCsv } from '../utils/csv';
import { formatMoney, formatPerson, getTodayDate } from '../utils/helpers';
import { usePersistentState } from '../hooks/usePersistentState';

type PersonalExpensesSectionProps = {
  householdInfo: HouseholdInfo | null;
  personalCategories: PersonalCategory[];
  personalExpenses: PersonalExpense[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

type PersonalPersonFilter = PersonKey | 'all';

type PersonalFilters = {
  month: string;
  person: PersonalPersonFilter;
  categoryId: string;
  search: string;
};

const defaultPersonalFilters: PersonalFilters = {
  month: '',
  person: 'all',
  categoryId: 'all',
  search: '',
};

function isPersonalPersonFilter(value: unknown): value is PersonalPersonFilter {
  return value === 'all' || value === 'thanasis' || value === 'sofia';
}

function isPersonalFilters(value: unknown): value is PersonalFilters {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const filters = value as Record<string, unknown>;

  return (
    typeof filters.month === 'string' &&
    isPersonalPersonFilter(filters.person) &&
    typeof filters.categoryId === 'string' &&
    typeof filters.search === 'string'
  );
}

export function PersonalExpensesSection({
  householdInfo,
  personalCategories,
  personalExpenses,
  onDataChanged,
  setMessage,
}: PersonalExpensesSectionProps) {
  const [savingPersonalExpense, setSavingPersonalExpense] = useState(false);

  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [person, setPerson] = useState<PersonKey>('thanasis');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [filters, setFilters] = usePersistentState<PersonalFilters>(
    'realpayapp-filters-personal',
    defaultPersonalFilters,
    isPersonalFilters
  );
  const {
    month: filterMonth,
    person: filterPerson,
    categoryId: filterCategoryId,
    search: filterSearch,
  } = filters;

  const filteredCategories = useMemo(() => {
    return personalCategories.filter((category) => category.person_key === person);
  }, [personalCategories, person]);

  const filterCategoryOptions = useMemo(() => {
    if (filterPerson === 'all') {
      return personalCategories;
    }

    return personalCategories.filter((category) => category.person_key === filterPerson);
  }, [filterPerson, personalCategories]);

  const filteredPersonalExpenses = useMemo(() => {
    const noteQuery = filterSearch.trim().toLocaleLowerCase('el-GR');

    return personalExpenses.filter((expense) => {
      const matchesMonth = !filterMonth || expense.expense_date.slice(0, 7) === filterMonth;
      const matchesPerson = filterPerson === 'all' || expense.person_key === filterPerson;
      const matchesCategory = filterCategoryId === 'all' || expense.category_id === filterCategoryId;
      const noteText = (expense.note ?? '').toLocaleLowerCase('el-GR');
      const matchesNote = !noteQuery || noteText.includes(noteQuery);

      return matchesMonth && matchesPerson && matchesCategory && matchesNote;
    });
  }, [filterCategoryId, filterMonth, filterSearch, filterPerson, personalExpenses]);

  const filteredPersonalTotals = useMemo(() => {
    const filteredPersonalTotal = filteredPersonalExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    const filteredThanasisPersonalTotal = filteredPersonalExpenses
      .filter((expense) => expense.person_key === 'thanasis')
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    const filteredSofiaPersonalTotal = filteredPersonalExpenses
      .filter((expense) => expense.person_key === 'sofia')
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    return {
      filteredPersonalTotal,
      filteredThanasisPersonalTotal,
      filteredSofiaPersonalTotal,
    };
  }, [filteredPersonalExpenses]);

  useEffect(() => {
    if (filteredCategories.length > 0) {
      const categoryExists = filteredCategories.some((category) => category.id === categoryId);

      if (!categoryExists) {
        setCategoryId(filteredCategories[0].id);
      }
    } else {
      setCategoryId('');
    }
  }, [filteredCategories, categoryId]);

  async function handleAddPersonalExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household.');
      return;
    }

    if (!categoryId) {
      setMessage('Διάλεξε προσωπική κατηγορία.');
      return;
    }

    const amountValue = Number(amount || 0);

    if (Number.isNaN(amountValue)) {
      setMessage('Βάλε σωστό ποσό.');
      return;
    }

    if (amountValue <= 0) {
      setMessage('Το προσωπικό έξοδο πρέπει να είναι μεγαλύτερο από 0.');
      return;
    }

    setSavingPersonalExpense(true);
    setMessage('');

    const { error } = await supabase.from('personal_expenses').insert({
      household_id: householdInfo.household_id,
      person_key: person,
      expense_date: expenseDate,
      category_id: categoryId,
      amount: amountValue,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(`Σφάλμα αποθήκευσης προσωπικού εξόδου: ${error.message}`);
      setSavingPersonalExpense(false);
      return;
    }

    setExpenseDate(getTodayDate());
    setAmount('');
    setNote('');

    await onDataChanged();

    setMessage('Το προσωπικό έξοδο αποθηκεύτηκε.');
    setSavingPersonalExpense(false);
  }

  async function handleDeletePersonalExpense(expenseId: string) {
    if (!householdInfo) return;

    const confirmDelete = window.confirm('Να διαγραφεί αυτό το προσωπικό έξοδο;');

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('personal_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('household_id', householdInfo.household_id);

    if (error) {
      setMessage(`Σφάλμα διαγραφής προσωπικού εξόδου: ${error.message}`);
      return;
    }

    await onDataChanged();
    setMessage('Το προσωπικό έξοδο διαγράφηκε.');
  }

  function clearFilters() {
    setFilters(defaultPersonalFilters);
  }

  return (
    <section className="section-flow bottom-grid">
      <section className="card section-form-card compact-form-card">
        <h2 className="compact-form-title">Νέο προσωπικό έξοδο</h2>

        <form onSubmit={handleAddPersonalExpense} className="form compact-form">
          <div className="compact-form-grid">
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
              Άτομο
              <select
                value={person}
                onChange={(event) => setPerson(event.target.value as PersonKey)}
                required
              >
                <option value="thanasis">Θανάσης</option>
                <option value="sofia">Σοφία</option>
              </select>
            </label>

            <label>
              Κατηγορία
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ποσό
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="π.χ. 4.50"
                required
              />
            </label>

            <label>
              Σημείωση
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="π.χ. καφές, ρούχα, μετακίνηση"
              />
            </label>

            <div className="compact-form-actions">
              <button type="submit" disabled={savingPersonalExpense || !categoryId}>
                {savingPersonalExpense ? 'Αποθήκευση...' : 'Αποθήκευση προσωπικού εξόδου'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card table-card section-table-card">
        <div className="section-title">
          <h2>Πίνακας προσωπικών εξόδων</h2>
          <span>{personalExpenses.length} καταχωρήσεις</span>
        </div>

        <div className="filters-panel">
          <div className="filters-grid">
            <label>
              Μήνας
              <input
                type="month"
                value={filterMonth}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    month: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Άτομο
              <select
                value={filterPerson}
                onChange={(event) => {
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    person: event.target.value as PersonalPersonFilter,
                    categoryId: 'all',
                  }));
                }}
              >
                <option value="all">Όλοι</option>
                <option value="thanasis">Θανάσης</option>
                <option value="sofia">Σοφία</option>
              </select>
            </label>

            <label>
              Κατηγορία
              <select
                value={filterCategoryId}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="all">Όλες οι κατηγορίες</option>
                {filterCategoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {filterPerson === 'all'
                      ? `${formatPerson(category.person_key)} - ${category.name}`
                      : category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Αναζήτηση σημείωσης
              <input
                type="text"
                value={filterSearch}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    search: event.target.value,
                  }))
                }
                placeholder="π.χ. καφές, ρούχα"
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
          <h3>Σύνολα φιλτραρισμένων προσωπικών εξόδων</h3>
          <div className="filtered-summary-grid">
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Σύνολο</span>
              <strong className="filtered-summary-value">
                {formatMoney(filteredPersonalTotals.filteredPersonalTotal)}
              </strong>
            </div>
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Θανάσης</span>
              <strong className="filtered-summary-value">
                {formatMoney(filteredPersonalTotals.filteredThanasisPersonalTotal)}
              </strong>
            </div>
            <div className="filtered-summary-item">
              <span className="filtered-summary-label">Σοφία</span>
              <strong className="filtered-summary-value">
                {formatMoney(filteredPersonalTotals.filteredSofiaPersonalTotal)}
              </strong>
            </div>
          </div>
        </section>

        <div className="table-toolbar">
          <span className="muted-count">
            Εμφάνιση {filteredPersonalExpenses.length} από {personalExpenses.length} καταχωρήσεις
          </span>
          <button
            type="button"
            className="export-button"
            disabled={filteredPersonalExpenses.length === 0}
            onClick={() => exportPersonalExpensesToCsv(filteredPersonalExpenses)}
          >
            Export CSV
          </button>
        </div>

        {personalExpenses.length === 0 ? (
          <p className="empty-text">Δεν υπάρχουν ακόμα προσωπικά έξοδα.</p>
        ) : filteredPersonalExpenses.length === 0 ? (
          <p className="empty-text">Δεν βρέθηκαν προσωπικά έξοδα με αυτά τα φίλτρα.</p>
        ) : (
          <>
            <div className="table-wrapper data-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ημερομηνία</th>
                    <th>Άτομο</th>
                    <th>Κατηγορία</th>
                    <th>Ποσό</th>
                    <th>Σημείωση</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPersonalExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.expense_date}</td>
                      <td>{formatPerson(expense.person_key)}</td>
                      <td>{expense.personal_categories?.name ?? 'Χωρίς κατηγορία'}</td>
                      <td>{formatMoney(Number(expense.amount))}</td>
                      <td>{expense.note ?? '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeletePersonalExpense(expense.id)}
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
              {filteredPersonalExpenses.map((expense) => (
                <article className="mobile-record-card" key={expense.id}>
                  <div className="mobile-record-header">
                    <strong>{formatPerson(expense.person_key)}</strong>
                    <span>{expense.expense_date}</span>
                  </div>

                  <dl className="mobile-record-details">
                    <div>
                      <dt>Κατηγορία</dt>
                      <dd>{expense.personal_categories?.name ?? 'Χωρίς κατηγορία'}</dd>
                    </div>
                    <div>
                      <dt>Ποσό</dt>
                      <dd>{formatMoney(Number(expense.amount))}</dd>
                    </div>
                    <div>
                      <dt>Σημείωση</dt>
                      <dd>{expense.note ?? '-'}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="danger-button mobile-delete-button"
                    onClick={() => handleDeletePersonalExpense(expense.id)}
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
