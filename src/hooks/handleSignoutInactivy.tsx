import React, { useEffect, useState } from "react";

const MODAL_TIME = 60; // segundos

interface IdleTimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export default function IdleTimeoutModal({
  isOpen,
  onClose,
  onSignOut,
}: IdleTimeoutModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(MODAL_TIME);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(MODAL_TIME);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onSignOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, onSignOut]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center border-4 border-amber-400">
        <div className="mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏱️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Sessão por inatividade
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Você ficou inativo por 5 minutos. Faça uma ação para continuar ou saia para fazer login novamente.
          </p>
          <p className="text-2xl font-mono font-bold text-amber-600">
            {secondsLeft}s
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
