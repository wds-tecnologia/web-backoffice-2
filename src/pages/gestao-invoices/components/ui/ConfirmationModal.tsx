// src/components/ui/ConfirmationModal.tsx
import { Dialog } from '@headlessui/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal = ({
  isOpen,
  title = 'Confirmação',
  message = 'Tem certeza que deseja continuar?',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  return (
    <Dialog open={isOpen} onClose={onCancel} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded bg-white p-6">
          <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2">{message}</Dialog.Description>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
            >
              Confirmar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};