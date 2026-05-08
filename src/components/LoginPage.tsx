import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { AppTheme } from '../types';

type LoginPageProps = {
  theme: AppTheme;
};

export function LoginPage({ theme }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoginLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage('Λάθος email ή κωδικός.');
    } else {
      setMessage('Συνδέθηκες επιτυχώς.');
      setEmail('');
      setPassword('');
    }

    setLoginLoading(false);
  }

  return (
    <main className="page center-page" data-theme={theme}>
      <section className="card small-card">
        <h1>RealPayApp</h1>
        <p className="subtitle">Σύνδεση με email και password</p>

        <form onSubmit={handleLogin} className="form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="π.χ. thanasis@email.com"
              required
            />
          </label>

          <label>
            Κωδικός
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ο κωδικός σου"
              required
            />
          </label>

          <button type="submit" disabled={loginLoading}>
            {loginLoading ? 'Σύνδεση...' : 'Σύνδεση'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}
