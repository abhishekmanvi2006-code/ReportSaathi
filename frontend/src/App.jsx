import React, { useState, useEffect } from 'react';
import './i18n/i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import DisclaimerBanner from './components/common/DisclaimerBanner';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExtractionVerificationPage from './pages/ExtractionVerificationPage';
import ExplanationDetailPage from './pages/ExplanationDetailPage';
import { fetchHealthStatus } from './api/client';
import { Database, CheckCircle, RefreshCw, X } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'login' | 'register' | 'dashboard' | 'verify' | 'explain'
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [showStatusPill, setShowStatusPill] = useState(true);

  // Probe backend status on mount
  useEffect(() => {
    fetchHealthStatus()
      .then((data) => setBackendHealth(data))
      .catch((err) => {
        console.warn('Backend probe offline:', err);
        setBackendHealth({ status: 'offline' });
      });
  }, []);

  // Redirect to dashboard if logged in and currently on auth screens
  useEffect(() => {
    if (isAuthenticated && (currentView === 'login' || currentView === 'register')) {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, currentView]);

  const handleGetStartedOrUpload = () => {
    if (isAuthenticated) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('register');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900">
      {/* 1. Mandatory Medical Safety Disclaimer Banner */}
      <DisclaimerBanner />

      {/* 2. Responsive Navigation Bar */}
      <Navbar
        onNavigateLanding={() => setCurrentView('landing')}
        onNavigateLogin={() => setCurrentView('login')}
        onNavigateRegister={() => setCurrentView('register')}
        onNavigateDashboard={() => setCurrentView('dashboard')}
      />

      {/* 3. Dynamic Page View */}
      <main className="flex-1">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">Initializing secure session...</p>
          </div>
        ) : currentView === 'login' ? (
          <LoginPage
            onNavigateRegister={() => setCurrentView('register')}
            onLoginSuccess={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'register' ? (
          <RegisterPage
            onNavigateLogin={() => setCurrentView('login')}
            onRegisterSuccess={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'dashboard' ? (
          isAuthenticated ? (
            <DashboardPage
              onVerifyDocument={(doc) => {
                setSelectedDocId(doc.id);
                setCurrentView('verify');
              }}
              onExplainDocument={(doc) => {
                setSelectedDocId(doc.id);
                setCurrentView('explain');
              }}
            />
          ) : (
            <LoginPage
              onNavigateRegister={() => setCurrentView('register')}
              onLoginSuccess={() => setCurrentView('dashboard')}
            />
          )
        ) : currentView === 'verify' && selectedDocId ? (
          isAuthenticated ? (
            <ExtractionVerificationPage
              documentId={selectedDocId}
              onBack={() => setCurrentView('dashboard')}
              onNavigateExplain={() => setCurrentView('explain')}
            />
          ) : (
            <LoginPage
              onNavigateRegister={() => setCurrentView('register')}
              onLoginSuccess={() => setCurrentView('dashboard')}
            />
          )
        ) : currentView === 'explain' && selectedDocId ? (
          isAuthenticated ? (
            <ExplanationDetailPage
              documentId={selectedDocId}
              onBack={() => setCurrentView('dashboard')}
              onNavigateVerify={() => setCurrentView('verify')}
            />
          ) : (
            <LoginPage
              onNavigateRegister={() => setCurrentView('register')}
              onLoginSuccess={() => setCurrentView('dashboard')}
            />
          )
        ) : (
          <LandingPage onUploadClick={handleGetStartedOrUpload} />
        )}
      </main>

      {/* 4. Backend Health Floating Badge */}
      {showStatusPill && (
        <aside
          aria-label="Backend status badge"
          className="fixed bottom-4 right-4 z-40 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl flex items-center gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-slate-700">Backend API:</span>
            {backendHealth?.status === 'healthy' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Healthy (SQLite)
              </span>
            ) : backendHealth?.status === 'offline' ? (
              <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowStatusPill(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Dismiss status pill"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* 5. Professional Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
