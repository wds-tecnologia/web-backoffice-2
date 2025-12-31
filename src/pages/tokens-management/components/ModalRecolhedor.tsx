import React, { useState, useEffect } from "react";

interface ModalRecolhedorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nome: string, taxa: number, balance: number, comission: number) => void;
  recolhedorEdit?: {
    name: string;
    comission: number;
    balance: number;
    tax: number;
  };
}

const ModalRecolhedor: React.FC<ModalRecolhedorProps> = ({
  isOpen,
  onClose,
  onSave,
  recolhedorEdit,
}) => {
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState(1.025);
  const [balance, setBalance] = useState("");
  const [comission, setComision] = useState("");
  useEffect(() => {
    if (recolhedorEdit) {
      setNome(recolhedorEdit.name);
      setTaxa(recolhedorEdit.tax);
      setBalance(String(recolhedorEdit.balance)); // Converte para string ao editar
    } else {
      setNome("");
      setTaxa(1.025);
      setBalance("");
    }
  }, [recolhedorEdit, isOpen]);

  const handleSave = () => {
    onSave(nome, taxa, Number(balance), Number(comission)); // Converte para Number ao salvar
  };
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
        <h2 className="text-xl font-semibold mb-4 text-blue-700">
          {recolhedorEdit ? "Editar Recolhedor" : "Novo Recolhedor"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Nome do Recolhedor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Comissão (%)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={comission}
              onChange={(e) => setComision(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Taxa (USD)</label>
            <input
              type="number"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={taxa}
              onChange={(e) => setTaxa(Number(e.target.value))}
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700">Saldo (USD)</label>
            <input
              type="number"

              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={balance}
              onChange={(e) => setBalance(e.target.value)} // Mantém como string no onChange
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
              onClick={handleSave} // Chama a função handleSave
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalRecolhedor;