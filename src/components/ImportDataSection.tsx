import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { HouseholdInfo, PersonKey, SharedCategory } from '../types';

type ImportDataSectionProps = {
  householdInfo: HouseholdInfo | null;
  sharedCategories: SharedCategory[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

type ImportRowType = 'shared' | 'extra';

type ImportRow = {
  rowNumber: number;
  date: string;
  category: string;
  thanasisAmount: number;
  sofiaAmount: number;
  note: string;
  type: ImportRowType | '';
  errors: string[];
};

type ExtraImportDebt = {
  personKey: PersonKey;
  amount: number;
};

const requiredHeaders = ['date', 'category', 'thanasis_amount', 'sofia_amount', 'note', 'type'];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows.filter((row) => row.some((value) => value.trim() !== ''));
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase('el-GR');
}

function normalizeCategoryName(value: string) {
  return value.trim().toLocaleLowerCase('el-GR');
}

function parseAmount(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const parsedValue = Number(trimmedValue.replace(',', '.'));

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  return !Number.isNaN(parsedDate.getTime());
}

function getExtraImportDebt(row: ImportRow): ExtraImportDebt | null {
  const { thanasisAmount, sofiaAmount } = row;

  if (thanasisAmount > 0 && sofiaAmount < 0) {
    return { personKey: 'thanasis', amount: thanasisAmount };
  }

  if (sofiaAmount > 0 && thanasisAmount < 0) {
    return { personKey: 'sofia', amount: sofiaAmount };
  }

  if (thanasisAmount !== 0 && sofiaAmount === 0) {
    return { personKey: 'thanasis', amount: thanasisAmount };
  }

  if (sofiaAmount !== 0 && thanasisAmount === 0) {
    return { personKey: 'sofia', amount: sofiaAmount };
  }

  return null;
}

function buildImportRows(text: string) {
  const csvRows = parseCsv(text);

  if (csvRows.length < 2) {
    return {
      rows: [],
      error: 'Το CSV πρέπει να έχει header και τουλάχιστον μία εγγραφή.',
    };
  }

  const headers = csvRows[0].map(normalizeHeader);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      error: `Λείπουν στήλες από το CSV: ${missingHeaders.join(', ')}.`,
    };
  }

  const headerIndexes = new Map(headers.map((header, index) => [header, index]));

  const getValue = (row: string[], header: string) => {
    const columnIndex = headerIndexes.get(header);
    return columnIndex === undefined ? '' : row[columnIndex] ?? '';
  };

  const rows = csvRows.slice(1).map((csvRow, index) => {
    const errors: string[] = [];
    const date = getValue(csvRow, 'date').trim();
    const category = getValue(csvRow, 'category').trim();
    const note = getValue(csvRow, 'note').trim();
    const rawType = getValue(csvRow, 'type').trim().toLocaleLowerCase('el-GR');
    const thanasisAmount = parseAmount(getValue(csvRow, 'thanasis_amount'));
    const sofiaAmount = parseAmount(getValue(csvRow, 'sofia_amount'));
    const rowType: ImportRowType | '' =
      rawType === 'shared' || rawType === 'extra' ? rawType : '';

    if (!date) {
      errors.push('Λείπει ημερομηνία.');
    } else if (!isValidIsoDate(date)) {
      errors.push('Η ημερομηνία πρέπει να είναι YYYY-MM-DD.');
    }

    if (!rowType) {
      errors.push('Το type πρέπει να είναι shared ή extra.');
    }

    if (thanasisAmount === null) {
      errors.push('Το thanasis_amount πρέπει να είναι αριθμός.');
    }

    if (sofiaAmount === null) {
      errors.push('Το sofia_amount πρέπει να είναι αριθμός.');
    }

    const importRow: ImportRow = {
      rowNumber: index + 2,
      date,
      category,
      thanasisAmount: thanasisAmount ?? 0,
      sofiaAmount: sofiaAmount ?? 0,
      note,
      type: rowType,
      errors,
    };

    if (rowType === 'shared') {
      if (!category) {
        importRow.errors.push('Η shared εγγραφή χρειάζεται category.');
      }

      if (importRow.thanasisAmount === 0 && importRow.sofiaAmount === 0) {
        importRow.errors.push('Η shared εγγραφή δεν μπορεί να έχει και τα δύο ποσά 0.');
      }
    }

    if (rowType === 'extra' && !getExtraImportDebt(importRow)) {
      importRow.errors.push(
        'Η extra εγγραφή θέλει ποσό μόνο στη μία πλευρά ή θετικό ποσό στη μία και αρνητικό στην άλλη.'
      );
    }

    return importRow;
  });

  return { rows, error: '' };
}

export function ImportDataSection({
  householdInfo,
  sharedCategories,
  onDataChanged,
  setMessage,
}: ImportDataSectionProps) {
  const [fileName, setFileName] = useState('');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importResult, setImportResult] = useState('');

  const preview = useMemo(() => {
    const validRows = importRows.filter((row) => row.errors.length === 0);
    const invalidRows = importRows.filter((row) => row.errors.length > 0);
    const sharedRows = validRows.filter((row) => row.type === 'shared');
    const extraRows = validRows.filter((row) => row.type === 'extra');

    return {
      validRows,
      invalidRows,
      sharedRows,
      extraRows,
    };
  }, [importRows]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileName('');
    setImportRows([]);
    setParseError('');
    setImportResult('');
    setImportCompleted(false);

    if (!file) {
      return;
    }

    const text = await file.text();
    const result = buildImportRows(text);

    setFileName(file.name);
    setImportRows(result.rows);
    setParseError(result.error);
  }

  async function getSharedCategoryId(categoryName: string, categoryMap: Map<string, string>) {
    const categoryKey = normalizeCategoryName(categoryName);
    const existingCategoryId = categoryMap.get(categoryKey);

    if (existingCategoryId) {
      return existingCategoryId;
    }

    const { data, error } = await supabase
      .from('shared_categories')
      .insert({
        household_id: householdInfo!.household_id,
        name: categoryName,
      })
      .select('id, name')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? `Δεν δημιουργήθηκε η κατηγορία ${categoryName}.`);
    }

    categoryMap.set(categoryKey, data.id as string);

    return data.id as string;
  }

  async function handleImport() {
    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household για import.');
      return;
    }

    if (preview.invalidRows.length > 0 || preview.validRows.length === 0 || importCompleted) {
      return;
    }

    setImporting(true);
    setImportResult('');
    setMessage('');

    try {
      const categoryMap = new Map(
        sharedCategories.map((category) => [normalizeCategoryName(category.name), category.id])
      );

      const sharedRowsToInsert = [];

      for (const row of preview.sharedRows) {
        const categoryId = await getSharedCategoryId(row.category, categoryMap);

        sharedRowsToInsert.push({
          household_id: householdInfo.household_id,
          expense_date: row.date,
          category_id: categoryId,
          thanasis_amount: row.thanasisAmount,
          sofia_amount: row.sofiaAmount,
          note: row.note || null,
        });
      }

      const extraRowsToInsert = preview.extraRows.map((row) => {
        const debt = getExtraImportDebt(row)!;

        return {
          household_id: householdInfo.household_id,
          person_key: debt.personKey,
          debt_date: row.date,
          amount: debt.amount,
          reason: row.note || row.category || null,
        };
      });

      if (sharedRowsToInsert.length > 0) {
        const { error } = await supabase.from('shared_expenses').insert(sharedRowsToInsert);

        if (error) {
          throw new Error(error.message);
        }
      }

      if (extraRowsToInsert.length > 0) {
        const { error } = await supabase.from('extra_debts').insert(extraRowsToInsert);

        if (error) {
          throw new Error(error.message);
        }
      }

      await onDataChanged();

      const successMessage = `Το import ολοκληρώθηκε: ${sharedRowsToInsert.length} κοινά έξοδα και ${extraRowsToInsert.length} έξτρα χρέη.`;
      setImportCompleted(true);
      setImportResult(successMessage);
      setMessage(successMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Άγνωστο σφάλμα import.';
      setImportResult(`Σφάλμα import: ${errorMessage}`);
      setMessage(`Σφάλμα import: ${errorMessage}`);
    } finally {
      setImporting(false);
    }
  }

  const canImport =
    preview.validRows.length > 0 &&
    preview.invalidRows.length === 0 &&
    !importing &&
    !importCompleted;

  return (
    <section className="card import-section bottom-grid">
      <div className="import-header">
        <h2>Import δεδομένων</h2>
        <p>
          Ανέβασε CSV με στήλες date, category, thanasis_amount, sofia_amount, note, type.
          Το import γίνεται μόνο όταν πατήσεις “Εισαγωγή”.
        </p>
      </div>

      <div className="import-upload-row">
        <label>
          CSV αρχείο
          <input
            type="file"
            className="import-file-input"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
        </label>

        {fileName && <span className="import-file-name">{fileName}</span>}
      </div>

      {parseError && <p className="import-error-text">{parseError}</p>}

      {importRows.length > 0 && (
        <>
          <div className="import-preview-grid">
            <div className="import-preview-item">
              <span>Shared εγγραφές</span>
              <strong>{preview.sharedRows.length}</strong>
            </div>
            <div className="import-preview-item">
              <span>Extra εγγραφές</span>
              <strong>{preview.extraRows.length}</strong>
            </div>
            <div className="import-preview-item">
              <span>Προβλήματα</span>
              <strong className={preview.invalidRows.length > 0 ? 'debt-positive' : ''}>
                {preview.invalidRows.length}
              </strong>
            </div>
          </div>

          {preview.invalidRows.length > 0 && (
            <div className="import-errors">
              <h3>Γραμμές με πρόβλημα</h3>
              <ul className="import-error-list">
                {preview.invalidRows.slice(0, 8).map((row) => (
                  <li key={row.rowNumber}>
                    Γραμμή {row.rowNumber}: {row.errors.join(' ')}
                  </li>
                ))}
              </ul>
              {preview.invalidRows.length > 8 && (
                <p className="import-error-text">
                  Υπάρχουν ακόμη {preview.invalidRows.length - 8} προβληματικές γραμμές.
                </p>
              )}
            </div>
          )}

          <div className="import-actions">
            <button type="button" onClick={handleImport} disabled={!canImport}>
              {importing ? 'Εισαγωγή...' : 'Εισαγωγή'}
            </button>

            {preview.invalidRows.length > 0 && (
              <p className="import-helper-text">
                Διόρθωσε πρώτα τις προβληματικές γραμμές για να ενεργοποιηθεί η εισαγωγή.
              </p>
            )}

            {importCompleted && <p className="import-result">{importResult}</p>}
          </div>
        </>
      )}
    </section>
  );
}
