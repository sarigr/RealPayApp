import { useMemo } from 'react';
import type {
  HouseholdInfo,
  PersonKey,
  PersonalCategory,
  PersonalExpense,
  SharedCategory,
  SharedExpense,
} from '../types';
import { formatMoney, formatPerson } from '../utils/helpers';
import { ImportDataSection } from './ImportDataSection';

type ReportsSectionProps = {
  householdInfo: HouseholdInfo | null;
  sharedCategories: SharedCategory[];
  personalCategories: PersonalCategory[];
  sharedExpenses: SharedExpense[];
  personalExpenses: PersonalExpense[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

type MonthlyReportRow = {
  monthKey: string;
  monthLabel: string;
  categories: Record<string, number>;
  total: number;
};

function getMonthKey(dateText: string) {
  return dateText.slice(0, 7);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat('el-GR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getUniqueNames(names: string[]) {
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'el'));
}

function buildSharedMonthlyRows(expenses: SharedExpense[]): MonthlyReportRow[] {
  const rowsMap = new Map<string, MonthlyReportRow>();

  for (const expense of expenses) {
    const monthKey = getMonthKey(expense.expense_date);
    const categoryName = expense.shared_categories?.name ?? 'Χωρίς κατηγορία';
    const amount = Number(expense.total_amount);

    if (!rowsMap.has(monthKey)) {
      rowsMap.set(monthKey, {
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        categories: {},
        total: 0,
      });
    }

    const row = rowsMap.get(monthKey)!;

    row.categories[categoryName] = (row.categories[categoryName] ?? 0) + amount;
    row.total += amount;
  }

  return Array.from(rowsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function buildPersonalMonthlyRows(
  expenses: PersonalExpense[],
  person: PersonKey
): MonthlyReportRow[] {
  const rowsMap = new Map<string, MonthlyReportRow>();

  const personExpenses = expenses.filter((expense) => expense.person_key === person);

  for (const expense of personExpenses) {
    const monthKey = getMonthKey(expense.expense_date);
    const categoryName = expense.personal_categories?.name ?? 'Χωρίς κατηγορία';
    const amount = Number(expense.amount);

    if (!rowsMap.has(monthKey)) {
      rowsMap.set(monthKey, {
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        categories: {},
        total: 0,
      });
    }

    const row = rowsMap.get(monthKey)!;

    row.categories[categoryName] = (row.categories[categoryName] ?? 0) + amount;
    row.total += amount;
  }

  return Array.from(rowsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function ReportTable({
  title,
  categoryNames,
  rows,
}: {
  title: string;
  categoryNames: string[];
  rows: MonthlyReportRow[];
}) {
  return (
    <section className="card table-card bottom-grid">
      <div className="section-title">
        <h2>{title}</h2>
        <span>{rows.length} μήνες</span>
      </div>

      {rows.length === 0 ? (
        <p className="empty-text">Δεν υπάρχουν ακόμα δεδομένα για αναφορά.</p>
      ) : (
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Μήνας</th>

                {categoryNames.map((categoryName) => (
                  <th key={categoryName}>{categoryName}</th>
                ))}

                <th>Σύνολο</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.monthKey}>
                  <td>{row.monthLabel}</td>

                  {categoryNames.map((categoryName) => {
                    const value = row.categories[categoryName] ?? 0;

                    return (
                      <td key={categoryName}>
                        {value === 0 ? '-' : formatMoney(value)}
                      </td>
                    );
                  })}

                  <td>
                    <strong>{formatMoney(row.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ReportsSection({
  householdInfo,
  sharedCategories,
  personalCategories,
  sharedExpenses,
  personalExpenses,
  onDataChanged,
  setMessage,
}: ReportsSectionProps) {
  const sharedCategoryNames = useMemo(() => {
    const fromCategories = sharedCategories.map((category) => category.name);
    const fromExpenses = sharedExpenses.map(
      (expense) => expense.shared_categories?.name ?? 'Χωρίς κατηγορία'
    );

    return getUniqueNames([...fromCategories, ...fromExpenses]);
  }, [sharedCategories, sharedExpenses]);

  const thanasisCategoryNames = useMemo(() => {
    const fromCategories = personalCategories
      .filter((category) => category.person_key === 'thanasis')
      .map((category) => category.name);

    const fromExpenses = personalExpenses
      .filter((expense) => expense.person_key === 'thanasis')
      .map((expense) => expense.personal_categories?.name ?? 'Χωρίς κατηγορία');

    return getUniqueNames([...fromCategories, ...fromExpenses]);
  }, [personalCategories, personalExpenses]);

  const sofiaCategoryNames = useMemo(() => {
    const fromCategories = personalCategories
      .filter((category) => category.person_key === 'sofia')
      .map((category) => category.name);

    const fromExpenses = personalExpenses
      .filter((expense) => expense.person_key === 'sofia')
      .map((expense) => expense.personal_categories?.name ?? 'Χωρίς κατηγορία');

    return getUniqueNames([...fromCategories, ...fromExpenses]);
  }, [personalCategories, personalExpenses]);

  const sharedRows = useMemo(() => {
    return buildSharedMonthlyRows(sharedExpenses);
  }, [sharedExpenses]);

  const thanasisRows = useMemo(() => {
    return buildPersonalMonthlyRows(personalExpenses, 'thanasis');
  }, [personalExpenses]);

  const sofiaRows = useMemo(() => {
    return buildPersonalMonthlyRows(personalExpenses, 'sofia');
  }, [personalExpenses]);

  return (
    <section className="reports-section">
      <div className="reports-header">
        <h2>Αναφορές ανά μήνα και κατηγορία</h2>
        <p>
          Εδώ φαίνονται τα σύνολα ανά μήνα για κοινά και προσωπικά έξοδα.
        </p>
      </div>

      <ReportTable
        title="Κοινά έξοδα ανά μήνα"
        categoryNames={sharedCategoryNames}
        rows={sharedRows}
      />

      <ReportTable
        title={`Προσωπικά έξοδα ${formatPerson('thanasis')}`}
        categoryNames={thanasisCategoryNames}
        rows={thanasisRows}
      />

      <ReportTable
        title={`Προσωπικά έξοδα ${formatPerson('sofia')}`}
        categoryNames={sofiaCategoryNames}
        rows={sofiaRows}
      />

      <ImportDataSection
        householdInfo={householdInfo}
        sharedCategories={sharedCategories}
        onDataChanged={onDataChanged}
        setMessage={setMessage}
      />
    </section>
  );
}
