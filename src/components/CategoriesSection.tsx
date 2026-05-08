import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { HouseholdInfo, PersonKey, PersonalCategory, SharedCategory } from '../types';
import { formatPerson } from '../utils/helpers';

type CategoriesSectionProps = {
  householdInfo: HouseholdInfo | null;
  sharedCategories: SharedCategory[];
  personalCategories: PersonalCategory[];
  onDataChanged: () => Promise<void>;
  setMessage: (message: string) => void;
};

export function CategoriesSection({
  householdInfo,
  sharedCategories,
  personalCategories,
  onDataChanged,
  setMessage,
}: CategoriesSectionProps) {
  const [newSharedCategory, setNewSharedCategory] = useState('');
  const [newPersonalCategory, setNewPersonalCategory] = useState('');
  const [personalCategoryPerson, setPersonalCategoryPerson] = useState<PersonKey>('thanasis');

  const [savingSharedCategory, setSavingSharedCategory] = useState(false);
  const [savingPersonalCategory, setSavingPersonalCategory] = useState(false);

  const thanasisCategories = useMemo(() => {
    return personalCategories.filter((category) => category.person_key === 'thanasis');
  }, [personalCategories]);

  const sofiaCategories = useMemo(() => {
    return personalCategories.filter((category) => category.person_key === 'sofia');
  }, [personalCategories]);

  async function handleAddSharedCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household.');
      return;
    }

    const name = newSharedCategory.trim();

    if (!name) {
      setMessage('Γράψε όνομα κοινής κατηγορίας.');
      return;
    }

    setSavingSharedCategory(true);
    setMessage('');

    const { error } = await supabase.from('shared_categories').insert({
      household_id: householdInfo.household_id,
      name,
    });

    if (error) {
      setMessage(`Σφάλμα προσθήκης κοινής κατηγορίας: ${error.message}`);
      setSavingSharedCategory(false);
      return;
    }

    setNewSharedCategory('');
    await onDataChanged();

    setMessage('Η κοινή κατηγορία προστέθηκε.');
    setSavingSharedCategory(false);
  }

  async function handleAddPersonalCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!householdInfo) {
      setMessage('Δεν βρέθηκε household.');
      return;
    }

    const name = newPersonalCategory.trim();

    if (!name) {
      setMessage('Γράψε όνομα προσωπικής κατηγορίας.');
      return;
    }

    setSavingPersonalCategory(true);
    setMessage('');

    const { error } = await supabase.from('personal_categories').insert({
      household_id: householdInfo.household_id,
      person_key: personalCategoryPerson,
      name,
    });

    if (error) {
      setMessage(`Σφάλμα προσθήκης προσωπικής κατηγορίας: ${error.message}`);
      setSavingPersonalCategory(false);
      return;
    }

    setNewPersonalCategory('');
    await onDataChanged();

    setMessage('Η προσωπική κατηγορία προστέθηκε.');
    setSavingPersonalCategory(false);
  }

  async function handleDeleteSharedCategory(categoryId: string) {
    if (!householdInfo) return;

    const confirmDelete = window.confirm(
      'Να διαγραφεί αυτή η κοινή κατηγορία; Τα παλιά έξοδα δεν θα διαγραφούν, απλά θα χάσουν την κατηγορία.'
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('shared_categories')
      .delete()
      .eq('id', categoryId)
      .eq('household_id', householdInfo.household_id);

    if (error) {
      setMessage(`Σφάλμα διαγραφής κοινής κατηγορίας: ${error.message}`);
      return;
    }

    await onDataChanged();
    setMessage('Η κοινή κατηγορία διαγράφηκε.');
  }

  async function handleDeletePersonalCategory(categoryId: string) {
    if (!householdInfo) return;

    const confirmDelete = window.confirm(
      'Να διαγραφεί αυτή η προσωπική κατηγορία; Τα παλιά προσωπικά έξοδα δεν θα διαγραφούν, απλά θα χάσουν την κατηγορία.'
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('personal_categories')
      .delete()
      .eq('id', categoryId)
      .eq('household_id', householdInfo.household_id);

    if (error) {
      setMessage(`Σφάλμα διαγραφής προσωπικής κατηγορίας: ${error.message}`);
      return;
    }

    await onDataChanged();
    setMessage('Η προσωπική κατηγορία διαγράφηκε.');
  }

  function renderCategoryItems(
    categories: Array<{ id: string; name: string }>,
    onDelete: (categoryId: string) => void,
    emptyText: string
  ) {
    if (categories.length === 0) {
      return <p className="empty-text">{emptyText}</p>;
    }

    return categories.map((category) => (
      <div className="category-item" key={category.id}>
        <span className="category-name">{category.name}</span>

        <button
          type="button"
          className="danger-button category-delete-button"
          onClick={() => onDelete(category.id)}
        >
          Διαγραφή
        </button>
      </div>
    ));
  }

  return (
    <section className="categories-section">
      <header className="card categories-header-card">
        <h2>Κατηγορίες</h2>
        <p>Διαχείριση κοινών και προσωπικών κατηγοριών εξόδων.</p>
      </header>

      <div className="categories-form-grid">
        <section className="card category-form-card">
          <h3>Νέα κοινή κατηγορία</h3>

          <form onSubmit={handleAddSharedCategory} className="form compact-form">
            <div className="category-form-row">
              <label>
                Όνομα κατηγορίας
                <input
                  type="text"
                  value={newSharedCategory}
                  onChange={(event) => setNewSharedCategory(event.target.value)}
                  placeholder="π.χ. Φαρμακείο, Delivery, Δώρα"
                />
              </label>

              <button type="submit" disabled={savingSharedCategory}>
                {savingSharedCategory ? 'Προσθήκη...' : 'Προσθήκη'}
              </button>
            </div>
          </form>
        </section>

        <section className="card category-form-card">
          <h3>Νέα προσωπική κατηγορία</h3>

          <form onSubmit={handleAddPersonalCategory} className="form compact-form">
            <div className="category-form-row category-form-row-personal">
              <label>
                Άτομο
                <select
                  value={personalCategoryPerson}
                  onChange={(event) => setPersonalCategoryPerson(event.target.value as PersonKey)}
                >
                  <option value="thanasis">Θανάσης</option>
                  <option value="sofia">Σοφία</option>
                </select>
              </label>

              <label>
                Όνομα κατηγορίας
                <input
                  type="text"
                  value={newPersonalCategory}
                  onChange={(event) => setNewPersonalCategory(event.target.value)}
                  placeholder="π.χ. Hobby, Μαθήματα, Περιποίηση"
                />
              </label>

              <button type="submit" disabled={savingPersonalCategory}>
                {savingPersonalCategory ? 'Προσθήκη...' : 'Προσθήκη'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="card categories-lists-card">
        <div className="categories-lists-header">
          <h2>Πίνακες κατηγοριών</h2>
          <span>{sharedCategories.length + personalCategories.length} κατηγορίες</span>
        </div>

        <div className="categories-lists-grid">
          <article className="category-list-card">
            <div className="category-list-header">
              <h3>Κοινές</h3>
              <span className="category-count">{sharedCategories.length}</span>
            </div>
            <div className="category-items">
              {renderCategoryItems(
                sharedCategories,
                handleDeleteSharedCategory,
                'Δεν υπάρχουν κοινές κατηγορίες.'
              )}
            </div>
          </article>

          <article className="category-list-card">
            <div className="category-list-header">
              <h3>{formatPerson('thanasis')}</h3>
              <span className="category-count">{thanasisCategories.length}</span>
            </div>
            <div className="category-items">
              {renderCategoryItems(
                thanasisCategories,
                handleDeletePersonalCategory,
                'Δεν υπάρχουν προσωπικές κατηγορίες.'
              )}
            </div>
          </article>

          <article className="category-list-card">
            <div className="category-list-header">
              <h3>{formatPerson('sofia')}</h3>
              <span className="category-count">{sofiaCategories.length}</span>
            </div>
            <div className="category-items">
              {renderCategoryItems(
                sofiaCategories,
                handleDeletePersonalCategory,
                'Δεν υπάρχουν προσωπικές κατηγορίες.'
              )}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
