export type PersonKey = 'thanasis' | 'sofia';

export type AppTab = 'dashboard' | 'shared' | 'personal' | 'categories' | 'reports';

export type MoneyValue = number | string;

export type HouseholdInfo = {
  household_id: string;
  person_key: PersonKey;
  role: string;
};

export type SharedCategory = {
  id: string;
  name: string;
};

export type PersonalCategory = {
  id: string;
  household_id: string;
  person_key: PersonKey;
  name: string;
};

export type SharedExpense = {
  id: string;
  expense_date: string;
  category_id: string | null;
  thanasis_amount: MoneyValue;
  sofia_amount: MoneyValue;
  total_amount: MoneyValue;
  note: string | null;
  shared_categories: {
    name: string;
  } | null;
};

export type PersonalExpense = {
  id: string;
  household_id: string;
  person_key: PersonKey;
  expense_date: string;
  category_id: string | null;
  amount: MoneyValue;
  note: string | null;
  personal_categories: {
    name: string;
  } | null;
};

export type ExtraDebt = {
  id: string;
  household_id: string;
  person_key: PersonKey;
  debt_date: string;
  amount: MoneyValue;
  reason: string | null;
};

export type Totals = {
  totalAll: number;
  totalThanasis: number;
  totalSofia: number;
  fairShare: number;
  baseThanasisDebt: number;
  baseSofiaDebt: number;
  extraThanasisDebt: number;
  extraSofiaDebt: number;
  finalThanasisDebt: number;
  finalSofiaDebt: number;
  personalThanasisTotal: number;
  personalSofiaTotal: number;
};
