import { useState, useEffect, useRef } from "react";
import { TextField, Button, CircularProgress, Alert } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "../../backgrounds/animated-background";
import { api } from "../../../services/api";
import { styled } from "@mui/material/styles";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";

// Estilizando o TextField para melhorar a aparência
const StyledTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "rgba(0, 0, 0, 0.23)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(0, 0, 0, 0.5)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6870fa", // Cor roxa que combina com o tema existente
      borderWidth: 2,
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(0, 0, 0, 0.7)",
    "&.Mui-focused": {
      color: "#6870fa", // Cor roxa que combina com o tema existente
    },
  },
  "& .MuiInputBase-input": {
    color: "rgba(0, 0, 0, 0.87)", // Texto escuro para melhor legibilidade
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
    marginTop: 8,
  },
});

const CancelButton = styled(Button)({
  borderRadius: "8px",
  padding: "8px 16px",
  textTransform: "none",
  fontWeight: 600,
  boxShadow: "none",
  "&:hover": {
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
});

const SaveButton = styled(Button)({
  borderRadius: "8px",
  padding: "8px 24px",
  textTransform: "none",
  fontWeight: 600,
  background: "linear-gradient(45deg, #6870fa 30%, #868dfb 90%)",
  boxShadow: "0 3px 10px rgba(104, 112, 250, 0.3)",
  "&:hover": {
    background: "linear-gradient(45deg, #5961e5 30%, #7579e7 90%)",
    boxShadow: "0 4px 12px rgba(104, 112, 250, 0.4)",
  },
  "&.Mui-disabled": {
    background: "#e0e0e0",
    color: "rgba(0, 0, 0, 0.38)",
  },
});

interface EnhancedModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: string, canNavigate: boolean) => void;
  title: string;
  label: string;
}

export const EnhancedModal = ({ open, onClose, onSave, title, label }: EnhancedModalProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthBackoffice();

  useEffect(() => {
    if (open) {
      setInputValue("");
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!inputValue.trim()) return;

    console.log("inputValue", inputValue);

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(`/hardcoded?content=${encodeURIComponent(inputValue)}`, {id:user?.id});

      const canNavigate = response.data && response.data.success === true;

      onSave(inputValue, canNavigate);

      if (!canNavigate) {
        setError("Valor inválido. Não é possível acessar a planilha com este valor.");
      }
    } catch (err) {
      console.error("Erro na validação:", err);
      setError("Ocorreu um erro ao validar o valor. Por favor, tente novamente.");
      onSave(inputValue, false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50 overflow-hidden">
            <AnimatedBackground />
          </div>

          <motion.div
            ref={modalRef}
            className="bg-white mx-8 rounded-2xl shadow-2xl overflow-hidden relative z-10 w-full max-w-md border border-gray-100"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
          >
            <div className="h-2 bg-gradient-to-r from-[#6870fa] to-[#868dfb]"></div>

            <div className="p-8">
              <motion.div
                className="flex items-center mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="w-10 h-10 rounded-full bg-[#6870fa] bg-opacity-10 flex items-center justify-center mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6870fa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
              </motion.div>

              <motion.div
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <p className="text-gray-600 mb-4">
                  Digite o valor necessário para acessar a planilha. Este valor será validado antes de prosseguir.
                </p>
                <StyledTextField
                  autoFocus
                  margin="dense"
                  autoComplete="off"
                  label={label}
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (error) setError(null);
                  }}
                  error={!!error}
                  helperText={error}
                  disabled={isLoading}
                  InputProps={{
                    sx: {
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="mb-6"
                  >
                    <Alert
                      severity="error"
                      sx={{
                        borderRadius: "8px",
                        "& .MuiAlert-icon": {
                          color: "#d32f2f",
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="flex justify-end gap-3 mt-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <CancelButton onClick={onClose} variant="outlined" color="error" disabled={isLoading}>
                  Cancelar
                </CancelButton>
                <SaveButton onClick={handleSave} variant="contained" disabled={!inputValue.trim() || isLoading}>
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : "Continuar"}
                </SaveButton>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
