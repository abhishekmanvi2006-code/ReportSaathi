import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  // Load user on startup if access token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('reportsaathi_access');
      if (token) {
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          // Sync language preference if set
          if (profile.profile?.preferred_language && profile.profile.preferred_language !== i18n.language) {
            i18n.changeLanguage(profile.profile.preferred_language);
          }
        } catch (err) {
          console.warn('Failed to load profile on boot:', err);
          localStorage.removeItem('reportsaathi_access');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen to session expired event from axios interceptor
    const handleSessionExpired = () => {
      setUser(null);
      localStorage.removeItem('reportsaathi_access');
    };

    window.addEventListener('reportsaathi_session_expired', handleSessionExpired);
    return () => window.removeEventListener('reportsaathi_session_expired', handleSessionExpired);
  }, [i18n]);

  const login = async (username, password) => {
    const data = await authApi.login({ username, password });
    localStorage.setItem('reportsaathi_access', data.access);
    setUser(data.user);
    if (data.user.profile?.preferred_language) {
      i18n.changeLanguage(data.user.profile.preferred_language);
      localStorage.setItem('reportsaathi_language', data.user.profile.preferred_language);
    }
    return data.user;
  };

  const register = async (registrationData) => {
    const data = await authApi.register(registrationData);
    localStorage.setItem('reportsaathi_access', data.access);
    setUser(data.user);
    if (data.user.profile?.preferred_language) {
      i18n.changeLanguage(data.user.profile.preferred_language);
      localStorage.setItem('reportsaathi_language', data.user.profile.preferred_language);
    }
    return data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      localStorage.removeItem('reportsaathi_access');
      setUser(null);
    }
  };

  const updateLanguagePreference = async (langCode) => {
    if (user) {
      try {
        const updated = await authApi.updateProfile({ preferred_language: langCode });
        setUser(updated);
      } catch (err) {
        console.warn('Could not save language preference to server:', err);
      }
    }
    i18n.changeLanguage(langCode);
    localStorage.setItem('reportsaathi_language', langCode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateLanguagePreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
