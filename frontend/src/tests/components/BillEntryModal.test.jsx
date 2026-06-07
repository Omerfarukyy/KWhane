import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('../../services/billsService', () => ({
  insertBill: vi.fn(),
  diagnoseBill: vi.fn().mockResolvedValue(null),
  cacheDiagnosticSummary: vi.fn(),
}));

vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn((selector) => {
    const state = { objects: [], energyData: {}, deviceSpecs: {} };
    return selector(state);
  }),
}));
// expose getState for handleSubmit
import useSceneStore from '../../store/useSceneStore';
useSceneStore.getState = () => ({ objects: [], energyData: {}, deviceSpecs: {} });

import { insertBill } from '../../services/billsService';
import { LanguageProvider } from '../../contexts/LanguageProvider';
import { AuthProvider } from '../../contexts/AuthContext';
import BillEntryModal from '../../components/Dashboard/Bills/BillEntryModal';

const mockUser = { id: 'user-1' };

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: vi.fn(() => ({ user: mockUser })),
  };
});

const renderModal = (props = {}) =>
  render(
    <LanguageProvider>
      <BillEntryModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} {...props} />
    </LanguageProvider>
  );

describe('BillEntryModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <LanguageProvider>
        <BillEntryModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
      </LanguageProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form fields when open', () => {
    renderModal();
    expect(screen.getByText('Fatura Ekle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('312')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('745')).toBeInTheDocument();
  });

  it('shows effective tariff hint when both fields are filled', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('312'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('745'), { target: { value: '900' } });
    expect(screen.getByText(/₺3\.00\/kWh/)).toBeInTheDocument();
  });

  it('submit button is disabled when fields are empty', () => {
    renderModal();
    const btn = screen.getByRole('button', { name: /Kaydet/ });
    expect(btn).toBeDisabled();
  });

  it('submit button is enabled when all required fields are filled', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('312'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('745'), { target: { value: '900' } });
    expect(screen.getByRole('button', { name: /Kaydet/ })).not.toBeDisabled();
  });

  it('calls onClose when × button clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows duplicate period error from service', async () => {
    insertBill.mockResolvedValue({ error: { message: 'bills_user_period_uniq duplicate' } });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('312'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('745'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /Kaydet/ }));
    await waitFor(() =>
      expect(screen.getByText(/Bu döneme ait fatura zaten kayıtlı/)).toBeInTheDocument()
    );
  });

  it('shows generic error on other failures', async () => {
    insertBill.mockResolvedValue({ error: { message: 'network error' } });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('312'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('745'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /Kaydet/ }));
    await waitFor(() =>
      expect(screen.getByText(/tekrar deneyin/)).toBeInTheDocument()
    );
  });

  it('switches to diagnostic view on successful save', async () => {
    insertBill.mockResolvedValue({ data: { id: 'bill-1' } });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('312'), { target: { value: '300' } });
    fireEvent.change(screen.getByPlaceholderText('745'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /Kaydet/ }));
    await waitFor(() =>
      expect(screen.getByText('Fatura Kaydedildi')).toBeInTheDocument()
    );
  });
});
