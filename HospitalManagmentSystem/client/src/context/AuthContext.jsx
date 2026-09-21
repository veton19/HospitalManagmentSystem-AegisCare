import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (staffId, password) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, password })
      });
    } catch {
      throw new Error('Unable to reach the server. Make sure the backend is running on port 5050.');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Unexpected server response. Please try again.');
    }

    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem('jwt_token', data.token);
    setToken(data.token);
    setUser(data.staff);
    return data.staff;
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUser(null);
  };

  const getDashboardPath = (role) => {
    if (role === 'Admin') return '/admin';
    if (role === 'Doctor') return '/doctor';
    if (role === 'Nurse') return '/nurse';
    if (role === 'Pharmacist') return '/pharmacist';
    if (role === 'LabTech') return '/labtech';
    if (role === 'Receptionist') return '/receptionist';
    return '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchMe, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
