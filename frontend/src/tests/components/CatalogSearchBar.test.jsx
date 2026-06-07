import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageProvider';
import CatalogSearchBar from '../../components/Dashboard/Home/CatalogSearchBar';

const renderWithLang = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('CatalogSearchBar', () => {
  it('renders search input', () => {
    renderWithLang(<CatalogSearchBar />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('updates input value as user types', () => {
    renderWithLang(<CatalogSearchBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'buzdolabı' } });
    expect(input.value).toBe('buzdolabı');
  });

  it('calls onSearch with trimmed value on button click', () => {
    const onSearch = vi.fn();
    renderWithLang(<CatalogSearchBar onSearch={onSearch} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  klima  ' } });
    fireEvent.click(screen.getByRole('button'));
    expect(onSearch).toHaveBeenCalledWith('klima');
  });

  it('calls onSearch on Enter key press', () => {
    const onSearch = vi.fn();
    renderWithLang(<CatalogSearchBar onSearch={onSearch} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'tv' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('tv');
  });

  it('does not throw when onSearch is not provided', () => {
    renderWithLang(<CatalogSearchBar />);
    fireEvent.click(screen.getByRole('button'));
  });

  it('does not call onSearch on non-Enter keys', () => {
    const onSearch = vi.fn();
    renderWithLang(<CatalogSearchBar onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' });
    expect(onSearch).not.toHaveBeenCalled();
  });
});
