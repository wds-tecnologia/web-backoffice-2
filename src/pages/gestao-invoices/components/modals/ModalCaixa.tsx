import React, { useEffect, useState } from "react";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../../hooks/notification";

interface ModalCaixaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nome: string, descricao: string) => void;
  fetchDataUser?: () => void;
}

interface Pessoa {
  id: number;
  name: string;
}

const ModalCaixa: React.FC<ModalCaixaProps> = ({ isOpen, onClose, onSave, fetchDataUser }) => {
  const [tipoSelecionado, setTipoSelecionado] = useState("Recolhedor");
  const [nomeSelecionado, setNomeSelecionado] = useState("");
  const [nomeOutro, setNomeOutro] = useState("");
  const [descricao, setDescricao] = useState("");
  const { setOpenNotification } = useNotification();

  const [recolhedores, setRecolhedores] = useState<Pessoa[]>([]);
  const [fornecedores, setFornecedores] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // novo loading do submit

  useEffect(() => {
    if (!isOpen) return;

    setTipoSelecionado("Recolhedor");
    setNomeSelecionado("");
    setNomeOutro("");
    setDescricao("");
    setLoading(true);

    Promise.all([api.get("/collectors/list_collectors"), api.get("/invoice/supplier")])
      .then(([resRecolhedores, resFornecedores]) => {
        setRecolhedores(resRecolhedores.data);
        setFornecedores(resFornecedores.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar dados:", error);
        // Swal.fire({
        //   icon: "error",
        //   title: "Erro",
        //   text: "Erro ao carregar dados.",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Erro ao carregar dados!'
      });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSalvar = async () => {
    const nomeFinal = tipoSelecionado === "Outro" ? nomeOutro.trim() : nomeSelecionado;

    if (!nomeFinal) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Por favor, selecione ou digite um nome válido.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded font-semibold mr-2",
        },
      });
      return;
    }

    if (!descricao) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Por favor, adicione uma descrição!",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded font-semibold mr-2",
        },
      });
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/invoice/box", {
        name: nomeFinal,
        description: descricao,
      });

      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "Dados salvos com sucesso!",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold mr-2",
        },
      });
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Dados salvos com sucesso!'
      });

      onSave(nomeFinal, descricao);
      onClose();
    } catch (error) {
      // @ts-ignore
      if (response.data.code === "409") {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Usuario ja existe",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold mr-2",
          },
        });
        return;
      }
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao salvar os dados.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold mr-2",
        },
      });
    } finally {
      setSubmitting(false);
      fetchDataUser?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-semibold text-blue-500 mb-4">Nova Caixa</h2>

        {/* Tipo de Caixa */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Caixa</label>
          <select
            value={tipoSelecionado}
            onChange={(e) => setTipoSelecionado(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            disabled={submitting}
          >
            <option value="Recolhedor">Recolhedor</option>
            <option value="Fornecedor">Fornecedor</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        {/* Campos Dinâmicos */}
        {loading ? (
          <div className="text-sm text-gray-500 mb-4">Carregando dados...</div>
        ) : (
          <>
            {tipoSelecionado === "Recolhedor" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Recolhedor</label>
                <select
                  value={nomeSelecionado}
                  onChange={(e) => setNomeSelecionado(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                  disabled={submitting}
                >
                  <option value="">-- Escolher --</option>
                  {recolhedores.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoSelecionado === "Fornecedor" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Fornecedor</label>
                <select
                  value={nomeSelecionado}
                  onChange={(e) => setNomeSelecionado(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                  disabled={submitting}
                >
                  <option value="">-- Escolher --</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoSelecionado === "Outro" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Caixa</label>
                <input
                  type="text"
                  value={nomeOutro}
                  onChange={(e) => setNomeOutro(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                  placeholder="Digite o nome da caixa"
                  disabled={submitting}
                />
              </div>
            )}
          </>
        )}

        {/* Descrição */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Caixa</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Digite uma descrição..."
            rows={3}
            disabled={submitting}
          />
        </div>

        {/* Visualização da escolha */}
        <div className="bg-gray-100 p-3 rounded text-sm text-gray-600 mb-4">
          Nome da caixa:{" "}
          <strong>{tipoSelecionado === "Outro" ? nomeOutro || "Nenhum" : nomeSelecionado || "Nenhum"}</strong>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={loading || submitting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCaixa;
