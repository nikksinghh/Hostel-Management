import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campushome_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('campushome_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('campushome_user', JSON.stringify(res.data.user));
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password, user_type) => {
    const res = await api.post('/auth/login', { email, password, user_type });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('campushome_token', res.data.token);
      localStorage.setItem('campushome_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const loginWithGoogle = async (credential, institution_id) => {
    const res = await api.post('/auth/google', { credential, institution_id });
    if (res.data.success && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('campushome_token', res.data.token);
      localStorage.setItem('campushome_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const setAuthData = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);
    if (newToken) localStorage.setItem('campushome_token', newToken);
    if (newUser) localStorage.setItem('campushome_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campushome_token');
    localStorage.removeItem('campushome_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role, login, loginWithGoogle, setAuthData, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
