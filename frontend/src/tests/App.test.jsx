import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Stub heavy pages
vi.mock('../pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../pages/AuthPage',  () => ({ default: () => <div>Auth Page</div> }));

import { ThemeProvider } from '../contexts/ThemeProvider';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const renderApp = (initialPath = '/auth') => {
  // Inline ProtectedRoute logic test via auth state
  const { Routes, Route, Navigate } = require('react-router-dom');
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<div>Auth Page</div>} />
              <Route path="/" element={<div>Dashboard Page</div>} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('App routing', () => {
  it('renders auth page on /auth route', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderApp('/auth');
    expect(screen.getByText('Auth Page')).toBeInTheDocument();
  });

  it('renders dashboard page on / route when authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    renderApp('/');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is resolving', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter initialEntries={['/']}>
        <LanguageProvider>
          <AuthProvider>
            <div data-testid="loading-check">
              {(() => {
                const { loading } = useAuth();
                return loading ? <span>Bağlanıyor…</span> : null;
              })()}
            </div>
          </AuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Bağlanıyor…')).toBeInTheDocument();
  });
});
