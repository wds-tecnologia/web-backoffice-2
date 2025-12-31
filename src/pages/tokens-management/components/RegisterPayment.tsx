import type React from "react";
import { motion } from "framer-motion";
import { api } from "../../../services/api";

interface RegistrarPagamentoProps {
  supplierId: number;
  amount: number;
  description: string;
  date: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: Error) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

const RegisterPayment: React.FC<RegistrarPagamentoProps> = ({
  supplierId,
  amount,
  description,
  date,
  onSuccess,
  onError,
  isProcessing = false,
  disabled,
}) => {
  const handleRegistrarClick = async () => {
    if (isProcessing || disabled !== undefined || !amount || !description.trim()) {
      return;
    }

    try {
      // Chamada à API para registrar o pagamento
      const response = await api.post("/api/payments", {
        supplierId,
        amount,
        description,
        date,
      });

      // Chama a função de sucesso se fornecida
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      // Chama a função de erro se fornecida
      if (onError) {
        onError(error as Error);
      }
    }
  };

  return (
    <motion.button
      whileHover={!isProcessing && !disabled ? { scale: 1.02 } : {}}
      whileTap={!isProcessing && !disabled ? { scale: 0.98 } : {}}
      onClick={handleRegistrarClick}
      className={`${
        isProcessing
          ? "bg-blue-400 cursor-not-allowed"
          : disabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
      } text-white px-4 py-2 rounded w-full flex items-center justify-center`}
      disabled={isProcessing || disabled}
    >
      {isProcessing ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
          ></motion.div>
          PROCESSANDO...
        </>
      ) : (
        <>
          <i className="fas fa-check mr-2"></i> REGISTRAR
        </>
      )}
    </motion.button>
  );
};

export default RegisterPayment;