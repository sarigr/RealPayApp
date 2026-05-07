import type { ExtraDebt, MoneyValue, PersonalExpense, SharedExpense } from '../types';
import { formatPerson } from './helpers';

type CsvValue = string | number | null | undefined;
type CsvRow = CsvValue[];

function formatCsvAmount(value: MoneyValue) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : '';
}

export function escapeCsvValue(value: CsvValue) {
  const text = value === null || value === undefined ? '' : String(value);
  const escapedText = text.replace(/"/g, '""');

  if (/[",\r\n]/.test(escapedText)) {
    return `"${escapedText}"`;
  }

  return escapedText;
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csvContent = `\uFEFF${rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\r\n')}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSharedExpensesToCsv(expenses: SharedExpense[]) {
  downloadCsv('realpayapp-koina-exoda.csv', [
    ['Ημερομηνία', 'Κατηγορία', 'Θανάσης', 'Σοφία', 'Σύνολο', 'Σημείωση'],
    ...expenses.map((expense) => [
      expense.expense_date,
      expense.shared_categories?.name ?? 'Χωρίς κατηγορία',
      formatCsvAmount(expense.thanasis_amount),
      formatCsvAmount(expense.sofia_amount),
      formatCsvAmount(expense.total_amount),
      expense.note ?? '',
    ]),
  ]);
}

export function exportPersonalExpensesToCsv(expenses: PersonalExpense[]) {
  downloadCsv('realpayapp-prosopika-exoda.csv', [
    ['Ημερομηνία', 'Άτομο', 'Κατηγορία', 'Ποσό', 'Σημείωση'],
    ...expenses.map((expense) => [
      expense.expense_date,
      formatPerson(expense.person_key),
      expense.personal_categories?.name ?? 'Χωρίς κατηγορία',
      formatCsvAmount(expense.amount),
      expense.note ?? '',
    ]),
  ]);
}

export function exportExtraDebtsToCsv(debts: ExtraDebt[]) {
  downloadCsv('realpayapp-extra-xrei.csv', [
    ['Ημερομηνία', 'Άτομο', 'Ποσό', 'Αιτία'],
    ...debts.map((debt) => [
      debt.debt_date,
      formatPerson(debt.person_key),
      formatCsvAmount(debt.amount),
      debt.reason ?? '',
    ]),
  ]);
}
