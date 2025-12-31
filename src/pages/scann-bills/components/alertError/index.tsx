import { motion, AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { X, AlertCircle, AlertTriangle } from "lucide-react";

interface TextProps {
  children: ReactNode;
}

const Text = ({ children }: TextProps) => {
  return (
    <p className="flex-1 text-[15px] font-medium text-gray-900 pr-6">
      {children}
    </p>
  );
};

const ErrorIcon = () => {
  return (
    <div className="p-2 bg-red-50 rounded-full animate-pulse">
      <AlertTriangle className="w-6 h-6 text-red-500 fill-red-100" />
    </div>
  );
};

interface AlertErrorProps {
  closeAlert: () => void;
  children: ReactNode;
  isMobile?: boolean;
}

export const AlertError = ({ children, closeAlert, isMobile = false }: AlertErrorProps) => {
  useEffect(() => {
    const timer = setTimeout(closeAlert, 5000); // Aumentei para 5s
    return () => clearTimeout(timer);
  }, [closeAlert]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 400,
        }}
        className={`
          fixed z-[9999] flex items-center gap-4 bg-white rounded-xl shadow-xl
          border border-red-100/50
          ${isMobile ? 
            "bottom-6 left-4 right-4 p-4 min-h-[72px]" : 
            "bottom-6 left-1/2 -translate-x-1/2 w-[340px] p-5 min-h-[80px]"
          }
        `}
      >
        {/* Pulsing glow effect */}
        <div className="absolute inset-0 rounded-xl bg-red-500/5 pointer-events-none"></div>
        
        <ErrorIcon />
        <Text>{children}</Text>
        <button
          type="button"
          onClick={closeAlert}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        {/* Progress bar */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5, ease: "linear" }}
          className="absolute bottom-0 left-0 h-1 bg-red-500/30 rounded-b-xl"
        />
      </motion.div>
    </AnimatePresence>
  );
};

export function showAlertError(message: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  const isMobile = window.innerWidth < 768;

  function handleClose() {
    root.unmount();
    document.body.removeChild(container);
  }

  root.render(
    <AlertError closeAlert={handleClose} isMobile={isMobile}>
      {message}
    </AlertError>
  );
}