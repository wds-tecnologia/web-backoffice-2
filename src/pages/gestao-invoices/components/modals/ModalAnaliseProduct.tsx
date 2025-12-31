// components/modals/ModalAnaliseProduct.tsx
import { X, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  product: {
    quantity: number;
    receivedQuantity: number;
    quantityAnalizer?: number;
    product: { name: string };
  };
  onClose: () => void;
  onConfirm: (analiseQuantity: number) => Promise<void>;
};

export function ModalAnaliseProduct({ product, onClose, onConfirm }: Props) {
  const [quantity, setQuantity] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);

  const maxAvailable =
    product.quantity - (product.receivedQuantity || 0) - (product.quantityAnalizer || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      const num = Number(value);
      if (num <= maxAvailable) {
        setQuantity(value === "" ? "" : num);
      }
    }
  };

  const isDisabled =
    quantity === "" || isNaN(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > maxAvailable;

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(Number(quantity));
    setIsLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Enviar para Análise</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-700">
          Produto: <strong>{product.product.name}</strong>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Quantidade restante: <strong>{maxAvailable}</strong>
        </p>

        <input
          type="number"
          min={1}
          max={maxAvailable}
          value={quantity}
          placeholder="Qtd a analisar"
          onChange={handleChange}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-800 placeholder-gray-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDisabled || isLoading}
            className={`px-4 py-2 rounded-md text-sm flex items-center justify-center ${
              isDisabled || isLoading
                ? "bg-yellow-200 text-white cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600 text-white"
            }`}
          >
            {isLoading && <Loader2 className="animate-spin mr-2" size={18} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
}
