import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoomCreationModal from '../../components/Simulation3D/RoomCreationModal';
import { LanguageProvider } from '../../contexts/LanguageProvider';

describe('RoomCreationModal', () => {
  it('uses the translated corridor label for an unnamed general room', () => {
    const onSave = vi.fn();

    render(
      <LanguageProvider>
        <RoomCreationModal isOpen onClose={vi.fn()} onSave={onSave} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Koridor');
    fireEvent.click(screen.getByRole('button', { name: 'Oluştur' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Koridor',
      roomType: 'Genel',
    }));
  });
});
