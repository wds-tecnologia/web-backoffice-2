// components/modals/ModalReceiveProduct.tsx
import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, Loader2 } from "lucide-react";

export type ProductData = {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  value: number;
  weight: number;
  total: number;
  received: boolean;
  receivedQuantity: number;
  quantityAnalizer: number;
  product: {
    id: string;
    name: string;
    code: string;
    priceweightAverage: number;
    weightAverage: number;
    description: string;
    active: boolean;
  };
};

interface ModalReceiveProductProps {
  product: ProductData;
  onClose: () => void;
  onConfirm: (receivedQuantity: number) => Promise<void>;
}

export const ModalReceiveProduct: React.FC<ModalReceiveProductProps> = ({
  product,
  onClose,
  onConfirm,
}) => {
  const [receivedQuantity, setReceivedQuantity] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);

  const maxAvailable = product.quantityAnalizer;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      const num = Number(value);
      if (num <= maxAvailable) {
        setReceivedQuantity(value === "" ? "" : num);
      }
    }
  };

  const isDisabled =
    receivedQuantity === "" ||
    isNaN(Number(receivedQuantity)) ||
    Number(receivedQuantity) < 1 ||
    Number(receivedQuantity) > maxAvailable;

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(Number(receivedQuantity));
    setIsLoading(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Receber Produto</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="text-sm text-gray-700 mb-1">
          Produto: <span className="font-semibold">{product.product.name}</span>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Quantidade a confirmar: <span className="font-medium">{maxAvailable}</span>
        </div>

        <input
          type="number"
          min={1}
          max={maxAvailable}
          value={receivedQuantity}
          placeholder="Qtd a receber"
          onChange={handleChange}
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-800 placeholder-gray-400"
        />

        <div className="flex justify-end gap-2 mt-2">
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
                ? "bg-emerald-300 text-white cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
};
