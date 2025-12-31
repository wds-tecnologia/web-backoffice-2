import React, { useState } from "react";
import { Boleto } from "./types";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ScannBillsBackoffice from "../../scann-bills/index-funcionando-mocado-apenas";
import { api } from "../../../services/api";

interface BoletoFormProps {
  addBoleto: (boleto: Boleto) => void;
}

const BoletoForm: React.FC<BoletoFormProps> = ({ addBoleto }) => {
  const [codigoBoleto, setCodigoBoleto] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [referencia, setReferencia] = useState("");
  const [status, setStatus] = useState("pendente");
  const [showScanner, setShowScanner] = useState(false);

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const newBoleto: Boleto = {
  //     id: Date.now(),
  //     codigo: codigoBoleto,
  //     dataPagamento,
  //     valor,
  //     referencia,
  //     status,
  //   };
  //   addBoleto(newBoleto);
  //   setCodigoBoleto("");
  //   setDataPagamento("");
  //   setValor(0);
  //   setReferencia("");
  //   setStatus("pendente");
  // };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const newBoleto = {
      name: referencia,
      description: referencia,
      data: {
        set: {
          valor,
          vencimento: dataPagamento,
          status,
          codigo: codigoBoleto,
        }
      }
    };
  
    if (valor === null) {
      alert("Preencha o valor do boleto.");
      return;
    }
    
    try {
      const response = await api.post("/billets/create_billet", newBoleto);
      
      const createdBoleto: Boleto = {
        id: response.data.id,
        codigo: codigoBoleto,
        dataPagamento,
        valor: valor ?? 0,
        referencia,
        status,
      };
  
      addBoleto(createdBoleto);
  
      // Resetar formulário
      setCodigoBoleto("");
      setDataPagamento("");
      setValor(0);
      setReferencia("");
      setStatus("pendente");
    } catch (error) {
      console.error("Erro ao criar boleto:", error);
      alert("Erro ao registrar boleto.");
    }
  };
  

  const handleShowScanner = () => {
    setShowScanner(true); // Exibe o componente
  };

  const handleClose = () => {
    setShowScanner(false); // Esconde o componente
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label htmlFor="codigoBoleto" className="block text-sm font-medium text-gray-700 mb-1">
          Código do Boleto:
        </label>
        <div className="flex items-center">
          <input
            type="text"
            id="codigoBoleto"
            value={codigoBoleto}
            onChange={(e) => setCodigoBoleto(e.target.value)}
            required
            placeholder="Número ou linha digitável"
            className="w-[95%] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            className="ml-2 text-blue-500 flex justify-center items-center w-[5%]"
            style={{
              height: "100%", // Para garantir que ocupe toda a altura do input
              padding: 0, // Remove qualquer padding extra
            }}
            onClick={handleShowScanner}
          >
            <Camera size={24} /> {/* Ícone de câmera com tamanho ajustado */}
          </button>
          {showScanner && <ScannBillsBackoffice handleClose={handleClose} />}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dataPagamento" className="block text-sm font-medium text-gray-700 mb-1">
            Data de Pagamento:
          </label>
          <input
            type="date"
            id="dataPagamento"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
            Valor do Boleto:
          </label>
          <input
            type="number"
            id="valor"
            value={valor === null ? "" : valor}
            onChange={(e) => setValor(Number(e.target.value))}
            required
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="referencia" className="block text-sm font-medium text-gray-700 mb-1">
          Referência (Descrição):
        </label>
        <textarea
          id="referencia"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          rows={3}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status:
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Registrar Boleto
        </button>
      </div>
    </form>
  );
};

export default BoletoForm;
