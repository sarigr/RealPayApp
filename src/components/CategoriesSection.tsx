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

  function renderSharedCategoryRows(categories: SharedCategory[]) {
    if (categories.length === 0) {
      return <p className="empty-text">Δεν υπάρχουν κοινές κατηγορίες.</p>;
    }

    return categories.map((category) => (
      <div className="category-row-fixed" key={category.id}>
        <span>{category.name}</span>

        <button
          type="button"
          className="danger-button"
          onClick={() => handleDeleteSharedCategory(category.id)}
        >
          Διαγραφή
        </button>
      </div>
    ));
  }

  function renderPersonalCategoryRows(categories: PersonalCategory[]) {
    if (categories.length === 0) {
      return <p className="empty-text">Δεν υπάρχουν προσωπικές κατηγορίες.</p>;
    }

    return categories.map((category) => (
      <div className="category-row-fixed" key={category.id}>
        <span>{category.name}</span>

        <button
          type="button"
          className="danger-button"
          onClick={() => handleDeletePersonalCategory(category.id)}
        >
          Διαγραφή
        </button>
      </div>
    ));
  }

  return (
    <section className="categories-wide-section bottom-grid">
      <section className="card compact-form-card">
        <h2 className="compact-form-title">Κατηγορίες</h2>

        <form onSubmit={handleAddSharedCategory} className="form compact-form">
          <div className="compact-form-grid compact-category-grid compact-category-grid-shared">
            <label>
              Νέα κοινή κατηγορία
              <input
                type="text"
                value={newSharedCategory}
                onChange={(event) => setNewSharedCategory(event.target.value)}
                placeholder="π.χ. Φαρμακείο, Delivery, Δώρα"
              />
            </label>

            <div className="compact-form-actions">
              <button type="submit" disabled={savingSharedCategory}>
                {savingSharedCategory ? 'Προσθήκη...' : 'Προσθήκη κοινής κατηγορίας'}
              </button>
            </div>
          </div>
        </form>

        <hr className="soft-divider" />

        <form onSubmit={handleAddPersonalCategory} className="form compact-form">
          <div className="compact-form-grid compact-category-grid">
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
              Νέα προσωπική κατηγορία
              <input
                type="text"
                value={newPersonalCategory}
                onChange={(event) => setNewPersonalCategory(event.target.value)}
                placeholder="π.χ. Hobby, Μαθήματα, Περιποίηση"
              />
            </label>

            <div className="compact-form-actions">
              <button type="submit" disabled={savingPersonalCategory}>
                {savingPersonalCategory ? 'Προσθήκη...' : 'Προσθήκη προσωπικής κατηγορίας'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card table-card">
        <div className="section-title">
          <h2>Πίνακες κατηγοριών</h2>
          <span>{sharedCategories.length + personalCategories.length} κατηγορίες</span>
        </div>

        <div className="category-grid-fixed">
          <div className="category-panel-fixed">
            <h3>Κοινές</h3>
            <div className="category-rows-fixed">
              {renderSharedCategoryRows(sharedCategories)}
            </div>
          </div>

          <div className="category-panel-fixed">
            <h3>{formatPerson('thanasis')}</h3>
            <div className="category-rows-fixed">
              {renderPersonalCategoryRows(thanasisCategories)}
            </div>
          </div>

          <div className="category-panel-fixed">
            <h3>{formatPerson('sofia')}</h3>
            <div className="category-rows-fixed">
              {renderPersonalCategoryRows(sofiaCategories)}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
