import { History, Eye, Edit, XIcon, RotateCcw, Check, Loader2, Trash, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../services/api";
import { Invoice } from "../types/invoice"; // Se necessário, ajuste o caminho do tipo
import { Product } from "./ProductsTab";
import { ModalReceiveProduct } from "../modals/ModalReceiveProduct";
import { an } from "framer-motion/dist/types.d-B50aGbjN";
import { ModalAnaliseProduct } from "../modals/ModalAnaliseProduct";
import Swal from "sweetalert2";
import { InvoiceProduct } from "./InvoiceProducts";

export type exchange = {
  id: string;
  date: Date;
  type: string;
  usd: number;
  rate: number;
  description: string;
  invoiceId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Carrier = {
  id: string;
  name: string;
  type: string;
  value: number;
  active: boolean;
};
export type InvoiceData = {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  carrierId: string;
  carrier2Id: string;
  taxaSpEs: number;
  amountTaxcarrier: number;
  amountTaxcarrier2: number;
  amountTaxSpEs: number;
  subAmount: number;
  overallValue: number;
  paid: boolean;
  paidDate: string | null;
  paidDollarRate: number | null;
  completed: boolean;
  completedDate: string | null;
  products: {
    id: string;
    invoiceId: string;
    productId: string;
    quantity: number;
    value: number;
    weight: number;
    total: number;
    received: boolean;
    analising: boolean;
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
  }[];
  supplier: {
    id: string;
    name: string;
    phone: string;
    active: boolean;
  };
  carrier: {
    id: string;
    name: string;
    type: string;
    value: number;
    active: boolean;
  };
  carrier2: {
    id: string;
    name: string;
    type: string;
    value: number;
    active: boolean;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ProductData = {
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
type InvoiceHistoryReportProps = {
  invoiceHistory: InvoiceData[];
  setInvoiceHistory: React.Dispatch<React.SetStateAction<InvoiceData[]>>;
};

export function InvoiceHistoryReport({
  invoiceHistory: invoices,
  setInvoiceHistory: setInvoices,
}: InvoiceHistoryReportProps) {
  const [receiptHistoryModal, setReceiptHistoryModal] = useState<{
    open: boolean;
    invoiceProductId: string | null;
    productName: string;
  }>({
    open: false,
    invoiceProductId: null,
    productName: "",
  });
  const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingId, setIsSavingId] = useState("");
  const [isSavingReceiveId, setIsSavingReceiveId] = useState("");
  const [isSavingReturnId, setIsSavingReturnId] = useState("");
  const [isSavingAnalyzeId, setIsSavingAnalyzeId] = useState("");
  const [exchanges, setExchangeResponse] = useState<exchange[]>([]);
  const [selectedProductToReceive, setSelectedProductToReceive] = useState<ProductData | null>(null);
  const [selectedProductToAnalyze, setSelectedProductToAnalyze] = useState<ProductData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const fetchInvoicesAndSuppliers = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, supplierResponse, productsResponse, exchangeResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
        api.get("/invoice/product"),
        api.get("/invoice/exchange-records"),
      ]);
      setExchangeResponse(exchangeResponse.data);
      // O backend agora retorna { products: [...], totalProducts: ..., page: ..., limit: ..., totalPages: ... }
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : productsResponse.data.products || []);
      setInvoices(invoiceResponse.data);
      setSuppliers(supplierResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInvoicesAndSuppliers();
  }, []);

  const getStatusText = (invoice: InvoiceData) => {
    console.log(invoice);
    if (invoice.completed && invoice.paid) return "Concluída";
    if (!invoice.completed && invoice.paid) return "Pago";
    return "Pendente";
  };

  const getStatusClass = (invoice: InvoiceData) => {
    if (invoice.completed && invoice.paid) return "bg-blue-100 text-blue-800";
    if (!invoice.completed && invoice.paid) return "bg-green-100 text-green-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const openModal = (invoice: InvoiceData, editMode: boolean) => {
    // if(invoice) return
    setSelectedInvoice(invoice);
    setIsEditMode(editMode);
    setIsModalOpen(true);
  };

  const UndoInvoicePaid = (idInvoice: string) => {
    if (!idInvoice) return;

    Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter isso!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, estornar!",
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400 px-4 py-2 rounded font-semibold",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .post(`/invoice/return-paid`, {
            idInvoice: idInvoice,
          })
          .then(() => {
            fetchInvoicesAndSuppliers();
            // Disparar evento customizado para atualizar outras abas
            window.dispatchEvent(new CustomEvent("invoiceUpdated"));
            Swal.fire({
              icon: "success",
              title: "Estornado!",
              text: "Invoice estornada com sucesso.",
              confirmButtonText: "Ok",
              buttonsStyling: false,
              customClass: {
                confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
              },
            });
          })
          .catch((error) => {
            console.error("Erro ao deletar invoice:", error);
            Swal.fire({
              icon: "error",
              title: "Error ",
              text: "Erro ao estornar invoice. Tente novamente.",
              confirmButtonText: "Ok",
              buttonsStyling: false,
              customClass: {
                confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
              },
            });
          });
      }
    });
  };

  const deleteInvoice = (idInvoice: string) => {
    if (!idInvoice) return;

    Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter isso!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, deletar!",
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400 px-4 py-2 rounded font-semibold",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        api
          .delete(`/invoice/delete/${idInvoice}`)
          .then(() => {
            setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== idInvoice));
            Swal.fire({
              icon: "success",
              title: "Deletado!",
              text: "Invoice deletada com sucesso.",
              confirmButtonText: "Ok",
              buttonsStyling: false,
              customClass: {
                confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
              },
            });
          })
          .catch((error) => {
            console.error("Erro ao deletar invoice:", error);
            Swal.fire({
              icon: "error",
              title: "Error ",
              text: "Erro ao deletar invoice. Tente novamente.",
              confirmButtonText: "Ok",
              buttonsStyling: false,
              customClass: {
                confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
              },
            });
          });
      }
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const getShippingTypeText = (type: string) => {
    switch (type) {
      case "percentage":
        return "%";
      case "perKg":
        return "$/kg";
      case "perUnit":
        return "$/un";
      default:
        return type;
    }
  };

  const shippingStrategies: Record<string, (carrierSelectedType: Carrier, item: any) => number> = {
    percentage: (carrierSelectedType, item) => item.value * (carrierSelectedType.value / 100),
    perKg: (carrierSelectedType, item) => item.weight * carrierSelectedType.value,
    perUnit: (carrierSelectedType, item) => carrierSelectedType.value,
  };

  const sendUpdateProductStatus = async (product: ProductData) => {
    if (!product) return;

    try {
      setIsSavingReturnId(product.id);
      setIsSaving(true);
      await api.patch("/invoice/update/product", {
        idProductInvoice: product.id,
        bodyupdate: {
          received: true,
        },
      });
      const [invoiceResponse] = await Promise.all([api.get("/invoice/get")]);

      const findInvoice = invoiceResponse.data.find((item: InvoiceData) => item.id === product.invoiceId);

      setSelectedInvoice(findInvoice);

      setInvoices(invoiceResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const taxInvoice = exchanges.find((item) => item.invoiceId === selectedInvoice?.id);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isOnlyViewMode = !selectedInvoice?.paid || selectedInvoice.completed;

  const handleReturnToPending = async (product: ProductData) => {
    try {
      setIsSavingId(product.id);
      setIsSaving(true);

      await api.patch("/invoice/update/product", {
        idProductInvoice: product.id,
        bodyupdate: {
          analising: false,
          quantityAnalizer: 0,
        },
      });

      const { data: updatedInvoices } = await api.get("/invoice/get");
      setInvoices(updatedInvoices);

      const updated = updatedInvoices.find((i: InvoiceData) => i.id === product.invoiceId);
      setSelectedInvoice(updated || null);
    } catch (err) {
      console.error("Erro ao devolver produto para pendente", err);
    } finally {
      setIsSaving(false);
      setIsSavingId("");
    }
  };

  return (
    <div className="mt-8 bg-white p-6 pt-4 rounded-lg shadow">
      <h2 className="text-xl  w-full justify-between items-center flex  flex-row font-semibold mb-4 text-blue-700 border-b pb-2">
        <div className="flex justify-center items-center">
          <History className="mr-2 inline" size={18} />
          Histórico de Invoices
        </div>
        <button onClick={() => fetchInvoicesAndSuppliers()} className="flex justify-center items-center">
          <RotateCcw className="mr-2 inline" size={24} />
        </button>
      </h2>

      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-500 py-6">Carregando invoices...</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornecedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor (R$)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma invoice encontrada
                  </td>
                </tr>
              ) : (
                invoices.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((invoice) => {
                  const supplier = suppliers.find((s) => s.id === invoice.supplierId);
                  const subtotal = invoice.products?.reduce((sum, product) => sum + product.total, 0) || 0;
                  const total = subtotal;
                  const tax = exchanges.find((item) => item.invoiceId === invoice.id);

                  return (
                    <tr key={invoice.id} className="odd:bg-blue-50 even:bg-green-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier?.name || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <i className="fas fa-clock text-green-500 mr-2"></i>
                        {(() => {
                          const date = new Date(invoice.date);
                          const horas = date.getHours();
                          const minutos = date.getMinutes();
                          const segundos = date.getSeconds();
                          const dataFormatada = date.toLocaleDateString("pt-BR");
                          const horaFormatada = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
                            2,
                            "0"
                          )}:${String(segundos).padStart(2, "0")}`;
                          return horas + minutos + segundos > 0 ? `${dataFormatada} ${horaFormatada}` : dataFormatada;
                        })()}{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
                            invoice
                          )}`}
                        >
                          {getStatusText(invoice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.user ? (
                          <span title={invoice.user.email}>{invoice.user.name || invoice.user.email || "Usuário"}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-end items-center">
                          {invoice.completed ? (
                            <button
                              onClick={() => openModal(invoice, false)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={16} />
                            </button>
                          ) : invoice.paid ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => UndoInvoicePaid(invoice.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Desfazer Pagamento"
                              >
                                <Undo2 size={16} />
                              </button>
                              <button
                                onClick={() => openModal(invoice, true)}
                                className="text-green-600 hover:text-green-900"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => openModal(invoice, false)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Visualizar"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openModal(invoice, false)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
        {/* Paginação */}
        {invoices.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage + 1} de {Math.ceil(invoices.length / itemsPerPage)}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(invoices.length / itemsPerPage) - 1))
              }
              disabled={(currentPage + 1) * itemsPerPage >= invoices.length}
              className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {isModalOpen && selectedInvoice && (
        // <!-- Modal Visualizar Invoice -->
        <div
          id="modalViewInvoice"
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 "
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">
                  Invoice #<span id="modalInvoiceNumber">{selectedInvoice.number}</span>
                </h3>
                <p className="text-sm text-gray-600">
                  ID: <span id="modalInvoiceSupplier">{selectedInvoice.id}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fornecedor: <span id="modalInvoiceSupplier">{selectedInvoice.supplier.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Data:{" "}
                  <span id="modalInvoiceDate">
                    {new Date(new Date(selectedInvoice.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Freteiro:{" "}
                  <span id="modalInvoiceCarrier">
                    {selectedInvoice.carrier.name} - {selectedInvoice.carrier?.value}{" "}
                    {getShippingTypeText(selectedInvoice.carrier?.type)}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Freteiro 2:{" "}
                  <span id="modalInvoiceCarrier">
                    {selectedInvoice.carrier2
                      ? `${selectedInvoice.carrier2.name} - ${selectedInvoice.carrier2.value} ${getShippingTypeText(
                          selectedInvoice.carrier2.type
                        )}`
                      : "não existe"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Frete Sp x ES: R$ <span id="modalInvoiceCarrier">{selectedInvoice.taxaSpEs}</span>
                </p>
              </div>
              <div>
                <span id="modalInvoiceStatus" className="px-3 py-1 rounded-full text-xs font-medium"></span>
                <button onClick={() => setIsModalOpen(false)} className="ml-2 text-gray-500 hover:text-gray-700">
                  <XIcon className="mr-2 inline" size={26} />
                </button>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes</h4>
              <div className="overflow-x-auto bg-white p-4 rounded-2xl shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Valor ($)" : "Valor ($)"}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Total ($)" : "Total ($)"}
                      </th>
                      {isEditMode && (
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody id="modalInvoicePendingProducts" className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => !item.received)
                      .sort((a, b) => {
                        const productA = products.find((p) => p.id === a.productId);
                        const productB = products.find((p) => p.id === b.productId);
                        const nameA = productA?.name || "";
                        const nameB = productB?.name || "";
                        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
                      })
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.quantity - product.quantityAnalizer - product.receivedQuantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.value.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">{product.total.toFixed(2)}</td>
                          {isEditMode && (
                            <td className="px-4 py-2 text-sm text-right">
                              <div className="flex justify-end items-center">
                                <button
                                  onClick={() => setSelectedProductToAnalyze(product)}
                                  disabled={
                                    product.quantityAnalizer + product.quantityAnalizer >= product.quantity ||
                                    product.receivedQuantity >= product.quantity
                                  }
                                  className={`ml-auto flex items-center gap-1 text-white px-2 py-1 rounded-md text-sm transition font-medium shadow-sm 
                      ${
                        product.quantityAnalizer + product.quantityAnalizer >= product.quantity ||
                        product.receivedQuantity >= product.quantity
                          ? "bg-gray-400 cursor-not-allowed opacity-60"
                          : "bg-yellow-600 hover:bg-yellow-500"
                      }`}
                                >
                                  <Check size={18} /> Analisar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    <tr className="bg-yellow-100 font-semibold">
                      <td className="flex flex-start items-center px-4 py-2 text-sm text-right text-gray-800">
                        Subtotal
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => !item.received)
                          .reduce(
                            (sum, item) => sum + (item.quantity - item.quantityAnalizer - item.receivedQuantity),
                            0
                          )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">—</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => !item.received)
                          .reduce(
                            (sum, item) =>
                              sum + item.weight * (item.quantity - item.quantityAnalizer - item.receivedQuantity),
                            0
                          )
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => !item.received)
                          .reduce((sum, item) => sum + item.total, 0)
                          .toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </td>
                      {isEditMode && <td className="px-4 py-2 text-sm text-right text-gray-800">—</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes de Análise</h4>
              <div className="overflow-x-auto bg-white p-4 rounded-2xl shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Valor (R$)" : "Valor ($)"}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Total (R$)" : "Total ($)"}
                      </th>
                      {isEditMode && (
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody id="modalInvoicePendingProducts" className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => item.analising && item.quantityAnalizer > 0)
                      .sort((a, b) => {
                        const productA = products.find((p) => p.id === a.productId);
                        const productB = products.find((p) => p.id === b.productId);
                        const nameA = productA?.name || "";
                        const nameB = productB?.name || "";
                        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
                      })
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{Math.abs(product.quantityAnalizer)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {(() => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, product)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, product)
                                : 0;
                              const valorUnitarioComTaxasFrete = product.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;

                              return valorBaseReal.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {(() => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, product)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, product)
                                : 0;
                              const valorUnitarioComTaxasFrete = product.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;
                              const custoFinal = valorBaseReal * product.quantityAnalizer;

                              return custoFinal.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}
                          </td>
                          {isEditMode && (
                            <td className="px-4 py-2 text-sm text-right">
                              <div className="flex justify-end items-center">
                                <div className="flex justify-center items-center w-full h-full">
                                  <button
                                    onClick={() => handleReturnToPending(product)}
                                    disabled={isSavingReturnId === product.id}
                                    className={`-mr-4 flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium shadow-sm transition
                                      ${
                                        isSavingReturnId === product.id
                                          ? "bg-gray-400 cursor-not-allowed opacity-60 text-white"
                                          : "bg-red-600 hover:bg-red-500 text-white"
                                      }`}
                                  >
                                    {isSavingReturnId === product.id ? (
                                      <>
                                        <Loader2 className="animate-spin" size={16} /> Removendo...
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw size={16} /> Devolver
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    <tr className="bg-green-100 font-semibold">
                      <td className="flex flex-start items-center px-4 py-2 text-sm text-right text-gray-800">
                        Subtotal
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => item.analising && !item.received)
                          .reduce((sum, item) => sum + Math.abs(item.quantityAnalizer), 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">—</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => item.analising && !item.received)
                          .reduce((sum, item) => sum + item.weight * item.quantityAnalizer, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {(() => {
                          const totalFrete =
                            selectedInvoice.amountTaxcarrier + (selectedInvoice.amountTaxcarrier2 ?? 0);
                          const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                          const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;

                          const total = selectedInvoice.products
                            .filter((item) => item.analising && !item.received)
                            .reduce((sum, item) => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, item)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, item)
                                : 0;
                              const valorUnitarioComTaxasFrete = item.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;
                              return sum + valorBaseReal * item.quantityAnalizer;
                            }, 0);

                          return total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </td>
                      {isEditMode && (
                        <td className="px-4 py-2 text-sm text-right">
                          <button
                            onClick={async () => {
                              setIsSavingId("all");
                              const productsToReceive = selectedInvoice.products.filter(
                                (item) => item.analising && !item.received
                              );

                              const today = new Date().toISOString();
                              for (const item of productsToReceive) {
                                const allreceived = item.receivedQuantity + item.quantityAnalizer >= item.quantity;
                                const quantityReceived = item.quantityAnalizer;
                                
                                await api.patch("/invoice/update/product", {
                                  idProductInvoice: item.id,
                                  bodyupdate: {
                                    received: allreceived,
                                    receivedQuantity: item.receivedQuantity + item.quantityAnalizer,
                                    quantityAnalizer: 0,
                                  },
                                });
                                
                                // Registrar no histórico de recebimentos
                                if (quantityReceived > 0) {
                                  try {
                                    await api.post("/invoice/product/receipt-history", {
                                      invoiceProductId: item.id,
                                      date: today,
                                      quantity: quantityReceived,
                                    });
                                  } catch (error) {
                                    console.error("Erro ao registrar histórico de recebimento:", error);
                                  }
                                }
                              }

                              const { data: updatedInvoices } = await api.get("/invoice/get");
                              setInvoices(updatedInvoices);
                              setSelectedInvoice(updatedInvoices.find((i: any) => i.id === selectedInvoice.id) || null);
                              setIsSavingId(""); // encerra loading
                            }}
                            disabled={isSavingId === "all"}
                            className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium shadow-sm transition
    ${
      isSavingId === "all"
        ? "bg-gray-400 cursor-not-allowed opacity-60 text-white"
        : "bg-green-600 hover:bg-green-500 text-white"
    }`}
                          >
                            {isSavingId === "all" ? (
                              <>
                                <Loader2 className="animate-spin" size={16} /> Recebendo...
                              </>
                            ) : (
                              <>
                                <Check size={16} /> Receber Todos
                              </>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Recebidos</h4>
              <div className="overflow-x-auto bg-white p-4 rounded-2xl shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Valor (R$)" : "Valor ($)"}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedInvoice.paid ? "Total (R$)" : "Total ($)"}
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Histórico
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoice.products
                      .filter((item) => item.receivedQuantity > 0)
                      .sort((a, b) => {
                        const productA = products.find((p) => p.id === a.productId);
                        const productB = products.find((p) => p.id === b.productId);
                        const nameA = productA?.name || "";
                        const nameB = productB?.name || "";
                        return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
                      })
                      .map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {products.find((item) => item.id === product.productId)?.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {product.receivedQuantity} / {product.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {(() => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, product)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, product)
                                : 0;
                              const valorUnitarioComTaxasFrete = product.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;

                              return valorBaseReal.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {(() => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, product)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, product)
                                : 0;
                              const valorUnitarioComTaxasFrete = product.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;

                              return (valorBaseReal * product.receivedQuantity).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            <button
                              onClick={async () => {
                                setReceiptHistoryModal({
                                  open: true,
                                  invoiceProductId: product.id,
                                  productName: products.find((item) => item.id === product.productId)?.name || "",
                                });
                                setLoadingHistory(true);
                                try {
                                  const response = await api.get(`/invoice/product/receipt-history/${product.id}`);
                                  setReceiptHistory(response.data || []);
                                } catch (error) {
                                  console.error("Erro ao buscar histórico:", error);
                                  setReceiptHistory([]);
                                } finally {
                                  setLoadingHistory(false);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                              title="Ver histórico de recebimentos"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    <tr className="bg-blue-100 font-semibold">
                      <td className="flex flex-start items-center px-4 py-2 text-sm text-right text-gray-800">
                        Subtotal
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => item.receivedQuantity > 0)
                          .reduce((sum, item) => sum + item.receivedQuantity, 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">—</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {selectedInvoice.products
                          .filter((item) => item.receivedQuantity > 0)
                          .reduce((sum, item) => sum + item.weight * item.receivedQuantity, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">
                        {(() => {
                          const totalFrete =
                            selectedInvoice.amountTaxcarrier + (selectedInvoice.amountTaxcarrier2 ?? 0);
                          const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                          const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;

                          const total = selectedInvoice.products
                            .filter((item) => item.receivedQuantity > 0)
                            .reduce((sum, item) => {
                              const taxCarrie = selectedInvoice.carrier
                                ? shippingStrategies[selectedInvoice.carrier?.type](selectedInvoice.carrier, item)
                                : 0;
                              const taxCarrie2 = selectedInvoice.carrier2
                                ? shippingStrategies[selectedInvoice.carrier2?.type](selectedInvoice.carrier2, item)
                                : 0;
                              const valorUnitarioComTaxasFrete = item.value + taxCarrie + taxCarrie2;

                              const totalQtdProdutos = selectedInvoice.products.reduce((acc, p) => acc + p.quantity, 0);
                              const freteSpEsRate = selectedInvoice.amountTaxSpEs / totalQtdProdutos;
                              const valorBaseReal =
                                valorUnitarioComTaxasFrete * (taxInvoice?.rate ?? 1) + freteSpEsRate;
                              return sum + valorBaseReal * item.receivedQuantity;
                            }, 0);

                          return total.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 transition hover:shadow-lg">
                <p className="text-sm text-gray-600">Frete 1:</p>
                <p id="modalInvoiceSubtotal" className="text-lg font-semibold">
                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(selectedInvoice.amountTaxcarrier * taxInvoice.rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {selectedInvoice.amountTaxcarrier.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 transition hover:shadow-lg">
                <p className="text-sm text-gray-600">Frete 2:</p>
                <p id="modalInvoiceShipping" className="text-lg font-semibold">
                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(selectedInvoice.amountTaxcarrier2 * taxInvoice.rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {selectedInvoice.amountTaxcarrier2.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 transition hover:shadow-lg">
                <p className="text-sm text-gray-600">Frete SP x ES:</p>
                <p id="modalInvoiceTax" className="text-lg font-semibold">
                  R${" "}
                  {selectedInvoice.amountTaxSpEs.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 transition hover:shadow-lg">
                <p className="text-sm text-gray-600">Total sem taxas:</p>
                <p id="modalInvoiceTax" className="text-lg font-semibold">
                  {taxInvoice?.rate ? (
                    <>
                      R${" "}
                      {(selectedInvoice.subAmount * taxInvoice.rate).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    <>
                      ${" "}
                      {(
                        selectedInvoice.subAmount +
                        selectedInvoice.amountTaxcarrier +
                        selectedInvoice.amountTaxcarrier2
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow mt-0">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                  <p id="modalInvoiceTotal" className="text-xl font-bold text-blue-800">
                    {taxInvoice?.rate ? (
                      <>
                        R${" "}
                        {(
                          (selectedInvoice.subAmount +
                            selectedInvoice.amountTaxcarrier +
                            selectedInvoice.amountTaxcarrier2) *
                            taxInvoice.rate +
                          selectedInvoice.amountTaxSpEs
                        ).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    ) : (
                      <>
                        ${" "}
                        {selectedInvoice.subAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-sm font-medium text-green-600">
                  {selectedInvoice.paidDate && (
                    <>
                      Pago em:{" "}
                      <span className="text-gray-800">
                        {new Date(selectedInvoice.paidDate).toLocaleDateString("pt-BR")}
                      </span>
                      <br />
                      {taxInvoice?.rate && (
                        <span className="text-blue-700 text-xs">Câmbio - (R$ {taxInvoice?.rate.toFixed(4)})</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedProductToAnalyze && (
              <ModalAnaliseProduct
                product={selectedProductToAnalyze}
                onClose={() => setSelectedProductToAnalyze(null)}
                onConfirm={async (quantityAnalizer: number) => {
                  try {
                    setIsSavingId(selectedProductToAnalyze.id);
                    setIsSaving(true);

                    const response = await api.patch("/invoice/update/product", {
                      idProductInvoice: selectedProductToAnalyze.id,
                      bodyupdate: {
                        analising: true,
                        quantityAnalizer: selectedProductToAnalyze.quantityAnalizer + quantityAnalizer,
                      },
                    });

                    const { data: updatedInvoices } = await api.get("/invoice/get");

                    // ESSA É A LINHA QUE FAZ FUNCIONAR — ela força atualizar o modal com os dados novos
                    const novaInvoice = updatedInvoices.find(
                      (i: InvoiceData) => i.id === selectedProductToAnalyze.invoiceId
                    );

                    setInvoices(updatedInvoices);
                    setSelectedInvoice(novaInvoice); // <- ESSA LINHA É CRUCIAL
                  } catch (err) {
                    console.error("Erro ao enviar para análise", err);
                  } finally {
                    setIsSaving(false);
                    setSelectedProductToAnalyze(null);
                  }
                }}
              />
            )}

            <div className="mt-6 flex justify-end">
              {/* <button id="printInvoiceBtn" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2">
                            <i className="fas fa-print mr-2"></i>Imprimir
                        </button>
                        <button id="exportInvoiceBtn" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                            <i className="fas fa-file-export mr-2"></i>Exportar
                        </button> */}
              {/* <button id="completeInvoiceBtn" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-2">
                            <i className="fas fa-check mr-2"></i>Marcar como Concluída
                        </button> */}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Recebimentos */}
      {receiptHistoryModal.open && (
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setReceiptHistoryModal({ open: false, invoiceProductId: null, productName: "" })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-blue-700">
                  Histórico de Recebimentos
                </h3>
                <p className="text-sm text-gray-600">
                  Produto: <span className="font-semibold">{receiptHistoryModal.productName}</span>
                </p>
              </div>
              <button
                onClick={() => setReceiptHistoryModal({ open: false, invoiceProductId: null, productName: "" })}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon size={24} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : receiptHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum registro de recebimento encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantidade Recebida
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receiptHistory.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {new Date(item.date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-green-600">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number, decimals = 2, currency = "BRL") {
  if (isNaN(value)) value = 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
