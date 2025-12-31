import React, { useState, useEffect } from "react";

interface ModalFornecedorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nome: string, taxa: number, balance: number) => void;
  fornecedorEdit?: {
    name: string;
    tax: number;
    balance: number;
  };
}

const ModalFornecedor: React.FC<ModalFornecedorProps> = ({
  isOpen,
  onClose,
  onSave,
  fornecedorEdit,
}) => {
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState(1.05);
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    if (fornecedorEdit) {
      setNome(fornecedorEdit.name.toUpperCase());
      setTaxa(fornecedorEdit.tax);
    } else {
      setNome("");
      setTaxa(1.05);
    }
  }, [fornecedorEdit, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
  
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div onClick={()=> onClose()} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div onClick={(e)=> e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-green-700">
          {fornecedorEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do Fornecedor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Taxa (USD)</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={taxa}
              onChange={(e) => setTaxa(Number(e.target.value.toUpperCase()))}
            />
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700">Saldo (USD)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
            />
          </div> */}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(nome, taxa, balance)}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalFornecedor;