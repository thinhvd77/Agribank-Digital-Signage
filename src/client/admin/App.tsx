import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import type { User } from '@shared/types';

type Page = 'dashboard' | 'users';

function loadStoredUser(): User | null {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const handleLogin = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPage('dashboard');
  };

  if (!token || !user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (page === 'users' && user.role === 'admin') {
    return (
      <UsersPage
        token={token}
        user={user}
        onNavigate={setPage}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Dashboard
      token={token}
      user={user}
      onNavigate={setPage}
      onLogout={handleLogout}
    />
  );
}
