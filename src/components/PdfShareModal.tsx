// src/components/PdfShareModal.tsx

import React, { useEffect, useState, Fragment } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { api } from "../services/api";
import { CheckIcon, ChevronDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable'; // Importe autoTable
import { useNotification } from "../hooks/notification";

// --- Definições de Tipos (Mova para um arquivo separado como src/types/pdfTypes.ts se preferir) ---

// Base comum para todos os relatórios
interface BaseReportData {
  title: string;
  issueDate: string;
  filterPeriod: string;
  reportName: string; // Nome para o arquivo/e-mail (ex: "extrato_fornecedor_X" ou "relatorio_lucros")
}

// Interface para Relatório de Fornecedor/Recolhedor (Transações)
interface TransactionReportData extends BaseReportData {
  type: "transaction"; // Discriminador
  currentBalance: string;
  transactions: Array<{ date: string; description: string; value: string }>;
  summary: {
    totalEntries: string;
    totalExits: string;
    periodBalance: string;
  };
}

// Interface para Relatório de Lucros
interface ProfitReportData extends BaseReportData {
  type: "profit"; // Discriminador
  operations: Array<{
    date: string;
    city: string;
    collectorName: string;
    supplierName: string;
    operationValue: string;
    profit: string;
  }>;
  summary: {
    filteredPeriodProfit?: string; // Presente se filterApplied for true
    currentMonthProfit?: string; // Presente se filterApplied for false
    previousMonthProfit?: string; // Presente se filterApplied for false
    totalAccumulated?: string;    // Presente se filterApplied for false
  };
}

// União Discriminada: PdfDataContent agora pode ser um dos tipos acima
type PdfDataContent = TransactionReportData | ProfitReportData;

// Nova interface para o tipo de usuário que inclui id e userName
interface User {
  id: string;
  userName: string;
}

// --- Fim das Definições de Tipos ---

interface PdfShareModalProps {
  onClose: () => void;
  // Prop para o botão de download, chama a função do componente pai que já gera e salva o PDF
  generatePDF: () => void;
  // Nova prop: função para obter os dados JSON brutos do PDF,
  // que o modal usará para enviar por PWA ou gerar para e-mail
  getPDFDataJSON: () => PdfDataContent | null;
  getFileToSendPDF: () => File | undefined
}

const PdfShareModal: React.FC<PdfShareModalProps> = ({ onClose, generatePDF, getPDFDataJSON, getFileToSendPDF }) => {
  const [users, setUsers] = useState<User[]>([]); // Altere para armazenar objetos User
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // Altere para armazenar o objeto User selecionado
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const { setOpenNotification } = useNotification();
  const [isSendEmail, setSendEmail] = useState(false);
  const [isLoadingDownloadPDF, setIsLoadingDownloadPDF] = useState(false);
  const [isSendToPWA, setIsSendToPWA] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");

        if (!token) {
          console.error("Token não encontrado!");
          return;
        }

        const response = await api.get("/graphic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Mapeie os dados para o novo formato User { id, userName }
        const userList: User[] = response.data.map((item: any) => ({
          id: item.id, // Supondo que 'id' seja a propriedade do ID do usuário na sua API
          userName: item.userName,
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };

    fetchUsers();
  }, []);

  // --- Função Auxiliar para Gerar PDF a partir de Dados JSON ---
  // Esta função reconstrói o PDF visualmente a partir dos dados brutos JSON.
  const generatePdfFromJSONData = (data: PdfDataContent): jsPDF => {
    const doc = new jsPDF({
      orientation: data.type === "profit" ? "landscape" : "portrait", // Condicional para orientação
      unit: "mm",
      format: "a4",
    });

    // Cabeçalho e informações gerais (comum a ambos)
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 40);
    doc.text(data.title, doc.internal.pageSize.width / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data de emissão: ${data.issueDate}`, 15, 22);
    doc.text(`Período: ${data.filterPeriod}`, 15, 27);

    // Lógica condicional para o conteúdo da tabela e resumo final
    if (data.type === "profit") {
      // Conteúdo específico para Relatório de Lucros
      autoTable(doc, {
        head: [["Data", "Operação", "Recolhedor", "Fornecedor", "Valor Operação", "Lucro"]],
        body: data.operations.map(op => [op.date, op.city, op.collectorName, op.supplierName, op.operationValue, op.profit]),
        startY: 32,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        didDrawPage: (pageData) => {
          doc.setFontSize(10);
          doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, doc.internal.pageSize.height - 10);
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      if (data.summary.filteredPeriodProfit) {
        doc.text(`Lucro Por Período Selecionado: ${data.summary.filteredPeriodProfit}`, 15, finalY);
      } else {
        doc.text(`Lucro Mês Atual: ${data.summary.currentMonthProfit}`, 15, finalY);
        doc.text(`Lucro Mês Anterior: ${data.summary.previousMonthProfit}`, 70, finalY);
        doc.text(`Total Acumulado: ${data.summary.totalAccumulated}`, 150, finalY);
      }

    } else { // data.type === "transaction" (para Fornecedor e Recolhedor)
      // Conteúdo específico para Relatório de Transações
      doc.text(`Saldo atual: ${data.currentBalance}`, 15, 35);
      autoTable(doc, {
        head: [["Data", "Descrição", "Valor (USD)"]],
        body: data.transactions.map(t => [t.date, t.description, t.value]),
        startY: 40,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: "left",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: { halign: "center" },
          2: { halign: "right" },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Saldo período selecionado: ${data.summary.periodBalance}`, 15, finalY);
    }

    return doc;
  };

  // --- Handlers dos Botões ---

  // Botão "Baixar PDF" - CHAMA A PROP ORIGINAL generatePDF DO COMPONENTE PAI
  const handleDownload = async () => {
    setIsLoadingDownloadPDF(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoadingDownloadPDF(false);
    console.log("Chamando a função 'generatePDF' original do componente pai...");
    generatePDF();
    onClose();
  };

  // Botão "Enviar para BR-PWA" - USA A NOVA PROP getPDFDataJSON
  const handleSendToPWA = async () => {
    if (!selectedUser) {
      setOpenNotification({
        type: 'warning',
        title: 'Atenção!',
        notification: 'Por favor, selecione um usuário para enviar!'
      });
      return;
    }

    console.log("Obtendo dados JSON do PDF para enviar para PWA...");
    const pdfDataJSON = getPDFDataJSON();

    if (!pdfDataJSON) {
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Não foi possível obter os dados do PDF para envio. Verifique o console!'
      });
      return;
    }

    try {
      setIsSendToPWA(true);
      console.log("Dados JSON obtidos, enviando para backend...");

      const token = localStorage.getItem("@backoffice:token");
      if (!token) {
        console.error("Token não encontrado!");
        setOpenNotification({
          type: 'error',
          title: 'Erro!',
          notification: 'Token de autenticação não encontrado. Faça login novamente!'
        });
        return;
      }

      const payload = {
        receiverId: selectedUser.id, // Enviando o ID do usuário
        data: pdfDataJSON, // Envia o JSON com os dados para o backend
      };

      const response = await api.post(
        "/backofficepdfs/sendpdf", // Endpoint da sua API para PWA
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Resposta do backend (PWA):", response);
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'PDF enviado com sucesso para o usuário BR-PWA!'
      });
      onClose();
    } catch (error: any) {
      console.error("Erro ao enviar PDF para PWA:", error?.response?.status, error?.response?.data);
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Erro ao enviar PDF para BR-PWA. Verifique o console para mais detalhes!'
      });
    } finally {
      setIsSendToPWA(false);
      setSelectedUser(null); // Limpa a seleção após o envio
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Botão "Enviar via E-mail" - USA A NOVA PROP getPDFDataJSON
  const handleSendEmail = async () => {
    
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Por favor, digite um e-mail.");
      setTimeout(() => { setEmailError("")},3000);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("E-mail inválido. Verifique e tente novamente.");
      setTimeout(() => { setEmailError("")},3000);
      return;
    }

    setEmailError("");

    console.log("Obtendo dados JSON do PDF para enviar por e-mail:", trimmedEmail);
    const pdfDataJSON = getPDFDataJSON();

    if (!pdfDataJSON) {
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Não foi possível obter os dados do PDF para envio por e-mail. Verifique o console!'
      });
      return;
    }

    try {
      setSendEmail(true);

      const pdfFile = getFileToSendPDF();
      if (!pdfFile) {
        setOpenNotification({
          type: 'error',
          title: 'Erro!',
          notification: 'Não foi possível obter o arquivo PDF para envio por e-mail.'
        });
        return;
      }

      const token = localStorage.getItem("@backoffice:token");
      if (!token) {
        console.error("Token não encontrado!");
        setOpenNotification({
          type: 'error',
          title: 'Erro!',
          notification: 'Token de autenticação não encontrado. Faça login novamente!'
        });
        return;
      }

      const [name] = trimmedEmail.split("@");
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", trimmedEmail); // troque conforme necessário
      formData.append("sender", "no-reply@suaempresa.com");
      formData.append("subject", "Relatório");
      formData.append("namefile",  pdfFile.name.split(".")[0]); // Nome do arquivo PDF
      formData.append("file", pdfFile);

      const response = await api.post(
        "/send_email_report", // Endpoint da sua API para envio de e-mail
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Resposta do backend (e-mail):", response);
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'PDF enviado por e-mail com sucesso!'
      });
      onClose();
    } catch (error: any) {
      console.error("Erro ao enviar PDF por e-mail:", error?.response?.status, error?.response?.data);

      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Erro ao enviar PDF por e-mail. Verifique o console para mais detalhes!'
      });
    }finally{
      setSendEmail(false);
      setEmail(""); // Limpa o campo de e-mail após o envio
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white px-6 pb-6 pt-8 text-left shadow-xl transition-all space-y-6">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl">
                  &times;
                </button>

                <Dialog.Title as="h3" className="text-2xl font-semibold text-gray-800 text-center">
                  Compartilhar PDF
                </Dialog.Title>
                <p className="text-sm text-gray-500 text-center ">Selecione apenas 1 opção para envio</p>

                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition text-lg font-medium"
                >

                  {isLoadingDownloadPDF ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      baixando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-download"></i>
                      Baixar PDF
                    </>
                  )}

                </button>

                <div className="space-y-2">
                  <label className="block text-gray-700 text-sm font-medium">
                    Selecione um usuário para enviar via BR-PWA:
                  </label>
                  <Listbox value={selectedUser} onChange={setSelectedUser}>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base">
                        <span className="block truncate">
                          {selectedUser ? selectedUser.userName.toUpperCase() : "-- Selecione o usuário --"}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {users.map((user) => (
                            <Listbox.Option
                              key={user.id} // Use o ID como chave
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                                  active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                                }`
                              }
                              value={user} // Passe o objeto User inteiro
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                                    {user.userName.toUpperCase()}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                <button
                  onClick={handleSendToPWA}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition text-lg font-medium"
                >


                  {isSendToPWA ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Enviando...
                    </>
                  ) : (
                    <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Enviar PDF para BR-PWA
                    </>
                  )}
                </button>

                <div className="space-y-2">
                  <label className="block text-gray-700 text-sm font-medium">Digite um e-mail para enviar:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendEmail();
                      }
                    }}
                    placeholder="exemplo@dominio.com"
                    className={`w-full border rounded-xl p-3 text-gray-700 text-base shadow-sm focus:outline-none focus:ring-2 ${
                      emailError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    }`}
                  />
                  {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                </div>

                <button
                  onClick={handleSendEmail}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-3 px-4 rounded-xl hover:bg-purple-600 transition text-lg font-medium"
                >
                  {isSendEmail? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-envelope"></i>
                          Enviar via E-mail
                    </>
                  )}
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default PdfShareModal