import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type {
  AppTab,
  AppTheme,
  ExtraDebt,
  HouseholdInfo,
  PersonalCategory,
  PersonalExpense,
  SharedCategory,
  SharedExpense,
  Totals,
} from './types';
import { LoginPage } from './components/LoginPage';
import { Topbar } from './components/Topbar';
import { DashboardSection } from './components/DashboardSection';
import { SharedExpensesSection } from './components/SharedExpensesSection';
import { ExtraDebtsSection } from './components/ExtraDebtsSection';
import { PersonalExpensesSection } from './components/PersonalExpensesSection';
import { CategoriesSection } from './components/CategoriesSection';
import { ReportsSection } from './components/ReportsSection';
import { AppNavigation } from './components/AppNavigation';
import './App.css';

const themeStorageKey = 'realpayapp-theme';
const activeTabStorageKey = 'realpayapp-active-tab';
const appThemes: AppTheme[] = ['dark', 'light', 'starwars', 'lotr'];
const appTabs: AppTab[] = ['dashboard', 'shared', 'personal', 'categories', 'reports'];

function isAppTheme(value: string | null): value is AppTheme {
  return value !== null && appThemes.includes(value as AppTheme);
}

function isAppTab(value: string | null): value is AppTab {
  return value !== null && appTabs.includes(value as AppTab);
}

function getInitialTheme(): AppTheme {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return isAppTheme(storedTheme) ? storedTheme : 'dark';
  } catch {
    return 'dark';
  }
}

function getInitialActiveTab(): AppTab {
  try {
    const storedTab = window.localStorage.getItem(activeTabStorageKey);
    return isAppTab(storedTab) ? storedTab : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialActiveTab);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  const [loading, setLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [householdInfo, setHouseholdInfo] = useState<HouseholdInfo | null>(null);
  const [sharedCategories, setSharedCategories] = useState<SharedCategory[]>([]);
  const [personalCategories, setPersonalCategories] = useState<PersonalCategory[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [extraDebts, setExtraDebts] = useState<ExtraDebt[]>([]);

  const totals: Totals = useMemo(() => {
    const totalAll = sharedExpenses.reduce((sum, expense) => sum + Number(expense.total_amount), 0);
    const totalThanasis = sharedExpenses.reduce((sum, expense) => sum + Number(expense.thanasis_amount), 0);
    const totalSofia = sharedExpenses.reduce((sum, expense) => sum + Number(expense.sofia_amount), 0);

    const fairShare = totalAll / 2;

    const baseThanasisDebt = fairShare - totalThanasis;
    const baseSofiaDebt = fairShare - totalSofia;

    const extraThanasisDebt = extraDebts
      .filter((debt) => debt.person_key === 'thanasis')
      .reduce((sum, debt) => sum + Number(debt.amount), 0);

    const extraSofiaDebt = extraDebts
      .filter((debt) => debt.person_key === 'sofia')
      .reduce((sum, debt) => sum + Number(debt.amount), 0);

    const finalThanasisDebt = baseThanasisDebt + extraThanasisDebt - extraSofiaDebt;
    const finalSofiaDebt = -finalThanasisDebt;

    const personalThanasisTotal = personalExpenses
      .filter((expense) => expense.person_key === 'thanasis')
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const personalSofiaTotal = personalExpenses
      .filter((expense) => expense.person_key === 'sofia')
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    return {
      totalAll,
      totalThanasis,
      totalSofia,
      fairShare,
      baseThanasisDebt,
      baseSofiaDebt,
      extraThanasisDebt,
      extraSofiaDebt,
      finalThanasisDebt,
      finalSofiaDebt,
      personalThanasisTotal,
      personalSofiaTotal,
    };
  }, [sharedExpenses, extraDebts, personalExpenses]);

  useEffect(() => {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
      document.documentElement.dataset.theme = theme;
    } catch {
      // Theme persistence is best-effort and intentionally local to this browser.
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(activeTabStorageKey, activeTab);
    } catch {
      // Active tab persistence is best-effort and intentionally local to this browser.
    }
  }, [activeTab]);

  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMessage(error.message);
      }

      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user.id) {
      loadAppData(session.user.id);
    } else {
      setHouseholdInfo(null);
      setSharedCategories([]);
      setPersonalCategories([]);
      setSharedExpenses([]);
      setPersonalExpenses([]);
      setExtraDebts([]);
    }
  }, [session]);

  async function loadAppData(userId: string) {
    setAppLoading(true);
    setMessage('');

    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('household_id, person_key, role')
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      setMessage('Δεν βρέθηκε household για τον χρήστη. Έλεγξε τους πίνακες στο Supabase.');
      setAppLoading(false);
      return;
    }

    const currentHousehold = memberData as HouseholdInfo;
    setHouseholdInfo(currentHousehold);

    await Promise.all([
      loadSharedCategories(currentHousehold.household_id),
      loadPersonalCategories(currentHousehold.household_id),
      loadSharedExpenses(currentHousehold.household_id),
      loadPersonalExpenses(currentHousehold.household_id),
      loadExtraDebts(currentHousehold.household_id),
    ]);

    setAppLoading(false);
  }

  async function loadSharedCategories(householdId: string) {
    const { data, error } = await supabase
      .from('shared_categories')
      .select('id, name')
      .eq('household_id', householdId)
      .order('name', { ascending: true });

    if (error) {
      setMessage(`Σφάλμα φόρτωσης κοινών κατηγοριών: ${error.message}`);
      return;
    }

    setSharedCategories((data ?? []) as SharedCategory[]);
  }

  async function loadPersonalCategories(householdId: string) {
    const { data, error } = await supabase
      .from('personal_categories')
      .select('id, household_id, person_key, name')
      .eq('household_id', householdId)
      .order('person_key', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      setMessage(`Σφάλμα φόρτωσης προσωπικών κατηγοριών: ${error.message}`);
      return;
    }

    setPersonalCategories((data ?? []) as PersonalCategory[]);
  }

  async function loadSharedExpenses(householdId: string) {
    const { data, error } = await supabase
      .from('shared_expenses')
      .select(`
        id,
        expense_date,
        category_id,
        thanasis_amount,
        sofia_amount,
        total_amount,
        note,
        shared_categories (
          name
        )
      `)
      .eq('household_id', householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Σφάλμα φόρτωσης κοινών εξόδων: ${error.message}`);
      return;
    }

    setSharedExpenses((data ?? []) as unknown as SharedExpense[]);
  }

  async function loadPersonalExpenses(householdId: string) {
    const { data, error } = await supabase
      .from('personal_expenses')
      .select(`
        id,
        household_id,
        person_key,
        expense_date,
        category_id,
        amount,
        note,
        personal_categories (
          name
        )
      `)
      .eq('household_id', householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Σφάλμα φόρτωσης προσωπικών εξόδων: ${error.message}`);
      return;
    }

    setPersonalExpenses((data ?? []) as unknown as PersonalExpense[]);
  }

  async function loadExtraDebts(householdId: string) {
    const { data, error } = await supabase
      .from('extra_debts')
      .select('id, household_id, person_key, debt_date, amount, reason')
      .eq('household_id', householdId)
      .order('debt_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Σφάλμα φόρτωσης έξτρα χρεών: ${error.message}`);
      return;
    }

    setExtraDebts((data ?? []) as ExtraDebt[]);
  }

  async function reloadSharedExpenses() {
    if (!householdInfo) return;
    await loadSharedExpenses(householdInfo.household_id);
  }

  async function reloadExtraDebts() {
    if (!householdInfo) return;
    await loadExtraDebts(householdInfo.household_id);
  }

  async function reloadPersonalExpenses() {
    if (!householdInfo) return;
    await loadPersonalExpenses(householdInfo.household_id);
  }

  async function reloadCategories() {
    if (!householdInfo) return;

    await Promise.all([
      loadSharedCategories(householdInfo.household_id),
      loadPersonalCategories(householdInfo.household_id),
    ]);
  }

  async function reloadImportedData() {
    if (!householdInfo) return;

    await Promise.all([
      loadSharedCategories(householdInfo.household_id),
      loadPersonalCategories(householdInfo.household_id),
      loadSharedExpenses(householdInfo.household_id),
      loadPersonalExpenses(householdInfo.household_id),
      loadExtraDebts(householdInfo.household_id),
    ]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setMessage('Αποσυνδέθηκες.');
  }

  if (loading) {
    return (
      <main className="page center-page" data-theme={theme}>
        <section className="card small-card">
          <h1>RealPayApp</h1>
          <p>Φόρτωση...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <LoginPage theme={theme} />;
  }

  return (
    <main className="page" data-theme={theme}>
      <Topbar
        email={session.user.email ?? 'Χωρίς email'}
        theme={theme}
        onThemeChange={setTheme}
        onLogout={handleLogout}
      />

      <AppNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {message && <p className="message wide-message">{message}</p>}

      {appLoading ? (
        <section className="card">
          <p>Φόρτωση δεδομένων...</p>
        </section>
      ) : (
        <>
          <div className={`tab-panel ${activeTab === 'dashboard' ? 'active' : 'hidden'}`}>
            <DashboardSection totals={totals} />
          </div>

          <div className={`tab-panel ${activeTab === 'shared' ? 'active' : 'hidden'}`}>
            <SharedExpensesSection
              householdInfo={householdInfo}
              sharedCategories={sharedCategories}
              sharedExpenses={sharedExpenses}
              onDataChanged={reloadSharedExpenses}
              setMessage={setMessage}
            />

            <ExtraDebtsSection
              householdInfo={householdInfo}
              extraDebts={extraDebts}
              onDataChanged={reloadExtraDebts}
              setMessage={setMessage}
            />
          </div>

          <div className={`tab-panel ${activeTab === 'personal' ? 'active' : 'hidden'}`}>
            <PersonalExpensesSection
              householdInfo={householdInfo}
              personalCategories={personalCategories}
              personalExpenses={personalExpenses}
              onDataChanged={reloadPersonalExpenses}
              setMessage={setMessage}
            />
          </div>

          <div className={`tab-panel ${activeTab === 'categories' ? 'active' : 'hidden'}`}>
            <CategoriesSection
              householdInfo={householdInfo}
              sharedCategories={sharedCategories}
              personalCategories={personalCategories}
              onDataChanged={reloadCategories}
              setMessage={setMessage}
            />
          </div>

          <div className={`tab-panel ${activeTab === 'reports' ? 'active' : 'hidden'}`}>
            <ReportsSection
              householdInfo={householdInfo}
              sharedCategories={sharedCategories}
              personalCategories={personalCategories}
              sharedExpenses={sharedExpenses}
              personalExpenses={personalExpenses}
              onDataChanged={reloadImportedData}
              setMessage={setMessage}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default App;
