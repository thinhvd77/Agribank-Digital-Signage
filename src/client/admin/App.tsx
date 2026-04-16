import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
