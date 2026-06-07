import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../lib/supabase', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((cb) => Promise.resolve(cb({ data: [], error: null }))),
    finally: vi.fn((cb) => { cb(); return Promise.resolve(); }),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  };
});

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
  };
});

import { supabase } from '../../lib/supabase';
import { LanguageProvider } from '../../contexts/LanguageProvider';
import SuggestionCards from '../../components/Dashboard/SuggestionCards';

const renderCards = () =>
  render(<LanguageProvider><SuggestionCards /></LanguageProvider>);

const makeRec = (overrides = {}) => ({
  id: '1',
  category: 'Isıtma',
  title: 'Termostat düşür',
  description: 'Gece termosta düşür',
  potential_savings_amount: 100,
  current_monthly_cost: 400,
  ...overrides,
});

describe('SuggestionCards', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows empty state when no recommendations', async () => {
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: vi.fn((cb) => Promise.resolve(cb({ data: [], error: null }))), finally: vi.fn((cb) => { cb(); return Promise.resolve(); }) };
    supabase.from.mockReturnValue(q);
    renderCards();
    await waitFor(() => expect(screen.getByText(/Henüz öneri yok/)).toBeInTheDocument());
  });

  it('renders a recommendation card', async () => {
    const recs = [makeRec()];
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: vi.fn((cb) => Promise.resolve(cb({ data: recs, error: null }))), finally: vi.fn((cb) => { cb(); return Promise.resolve(); }) };
    supabase.from.mockReturnValue(q);
    renderCards();
    await waitFor(() => expect(screen.getByText('Termostat düşür')).toBeInTheDocument());
  });

  it('shows savings pill when potential_savings_amount > 0', async () => {
    const recs = [makeRec({ potential_savings_amount: 100, current_monthly_cost: 400 })];
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: vi.fn((cb) => Promise.resolve(cb({ data: recs, error: null }))), finally: vi.fn((cb) => { cb(); return Promise.resolve(); }) };
    supabase.from.mockReturnValue(q);
    renderCards();
    await waitFor(() => expect(screen.getByText(/₺100\/ay tasarruf/)).toBeInTheDocument());
  });

  it('shows navigation buttons when multiple cards exist', async () => {
    const recs = [makeRec({ id: '1' }), makeRec({ id: '2', title: 'İkinci öneri' })];
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: vi.fn((cb) => Promise.resolve(cb({ data: recs, error: null }))), finally: vi.fn((cb) => { cb(); return Promise.resolve(); }) };
    supabase.from.mockReturnValue(q);
    renderCards();
    await waitFor(() => screen.getByText('Termostat düşür'));
    // Two nav buttons (prev + next)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show nav buttons for a single card', async () => {
    const recs = [makeRec()];
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), then: vi.fn((cb) => Promise.resolve(cb({ data: recs, error: null }))), finally: vi.fn((cb) => { cb(); return Promise.resolve(); }) };
    supabase.from.mockReturnValue(q);
    renderCards();
    await waitFor(() => screen.getByText('Termostat düşür'));
    expect(screen.queryAllByRole('button').length).toBe(0);
  });
});
