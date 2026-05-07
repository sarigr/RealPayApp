import type { PersonKey } from '../types';

export function getTodayDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function formatMoney(value: number) {
  return `${value.toFixed(2)} €`;
}

export function formatPerson(person: PersonKey) {
  return person === 'thanasis' ? 'Θανάσης' : 'Σοφία';
}