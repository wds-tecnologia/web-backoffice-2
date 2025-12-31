import { useState, useEffect } from "react";
import { Box, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../../../../services/api";
import { Invoice } from "../types/invoice";
import Swal from "sweetalert2";
import { ProductSearchSelect } from "./SupplierSearchSelect";
import { useNotification } from "../../../../hooks/notification";

export type InvoiceProduct = {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  value: number;
  price: number;
  weight: number;
  total: number;
  received: boolean;
  receivedQuantity: number;
};

interface InvoiceProductsProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: any) => void;
  onInvoiceSaved?: () => void; // 👈 Adicione isso
  [key: string]: any;
}
type CarrierEnum = "percentage" | "perKg" | "perUnit";

export type Carrier = {
  id: string;
  name: string;
  type: CarrierEnum;
  value: number;
  active: true;
};

export function InvoiceProducts({ currentInvoice, setCurrentInvoice, ...props }: InvoiceProductsProps) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [valorRaw, setValorRaw] = useState(""); 
  const [productForm, setProductForm] = useState({
    productId: "",
    quantity: "",
    value: "",
    weight: "",
    total: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { setOpenNotification } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsResponse, carriersResponse] = await Promise.all([
          api.get("/invoice/product"),
          api.get("/invoice/carriers"),
        ]);
        console.log("Produtos recebidos do backend:", productsResponse.data);
        // O backend agora retorna { products: [...], totalProducts: ..., page: ..., limit: ..., totalPages: ... }
        const productsList = Array.isArray(productsResponse.data) ? productsResponse.data : productsResponse.data.products || [];
        console.log("Lista de produtos processada:", productsList);
        // Verificar se os produtos têm priceweightAverage
        if (productsList.length > 0) {
          console.log("Primeiro produto exemplo:", productsList[0]);
          console.log("Preço do primeiro produto:", productsList[0].priceweightAverage);
        }
        setProducts(productsList);
        setCarriers(carriersResponse.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        // Swal.fire({
        //   icon: 'error',
        //   title: 'Erro',
        //   text: 'Erro ao carregar dados',
        //   confirmButtonColor: '#3085d6',
        // });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const deleteProduct = (index: number) => {
    const newProducts = [...currentInvoice.products];
    newProducts.splice(index, 1);
    setCurrentInvoice({ ...currentInvoice, products: newProducts });
  };

  const subTotal = currentInvoice.products.reduce((acc, item) => acc + Number(item.total), 0);
  const taxSpEs = currentInvoice.products.reduce((acc: number, item) => {
    return acc + item.quantity * Number(currentInvoice.taxaSpEs);
  }, 0);

  const shippingStrategies: Record<string, (carrierSelectedType: Carrier, item: InvoiceProduct) => number> = {
    percentage: (carrierSelectedType, item) => item.value * (carrierSelectedType.value / 100) * item.quantity,
    perKg: (carrierSelectedType, item) => item.weight * carrierSelectedType.value,
    perUnit: (carrierSelectedType, item) => item.quantity * carrierSelectedType.value,
  };

  const carrierSelectedType = carriers.find((carrier) => carrier.id === currentInvoice.carrierId);
  const carrierSelectedType2 = carriers.find((carrier) => carrier.id === currentInvoice?.carrier2Id);
  const amountTaxCarrieFrete1 = currentInvoice.products.reduce((acc: number, item) => {
    if (!carrierSelectedType) return acc;
    return acc + shippingStrategies[carrierSelectedType.type](carrierSelectedType, item);
  }, 0);

  const amountTaxCarrieFrete2 = currentInvoice.products.reduce((acc: number, item) => {
    if (!carrierSelectedType2) return acc;
    return acc + shippingStrategies[carrierSelectedType2.type](carrierSelectedType2, item);
  }, 0);

  const weightData =
    productForm.weight || products.find((item) => item.id === productForm.productId)?.weightAverage || "";
  const priceData =
    productForm.value || products.find((item) => item.id === productForm.productId)?.priceweightAverage || "";

  const totalWithFreight = amountTaxCarrieFrete1 + amountTaxCarrieFrete2 + subTotal;

  console.log(amountTaxCarrieFrete1);
  console.log(amountTaxCarrieFrete2);
  console.log(subTotal);
  console.log(totalWithFreight);
  const calculateProductTotal = () => {
    const quantity = parseFloat(productForm.quantity) || 0;
    const value = parseFloat(priceData) || 0;
    const total = quantity * value;
    setProductForm({ ...productForm, total: total.toFixed(2) });
  };

  const carrierOneName = carriers.find((carrier) => carrier.id === currentInvoice.carrierId)?.name;
  const carrierTwoName = carriers.find((carrier) => carrier.id === currentInvoice.carrier2Id)?.name;

  useEffect(() => {
    setCurrentInvoice((prevInvoice: Invoice) => ({
      ...prevInvoice,
      amountTaxSpEs: taxSpEs,
      amountTaxcarrier: amountTaxCarrieFrete1,
      amountTaxcarrier2: amountTaxCarrieFrete2,
      subAmount: subTotal,
    }));
  }, [taxSpEs, amountTaxCarrieFrete1, amountTaxCarrieFrete2, subTotal]);

  const addProduct = () => {
    const product = products.find((p) => p.id === productForm.productId);
    if (!product) return;

    const quantity = parseFloat(productForm.quantity);
    const value = parseFloat(priceData);
    const weight = parseFloat(weightData) || product.weight || 0;
    const total = parseFloat(productForm.total);

    if (!productForm.productId || isNaN(quantity) || isNaN(value) || isNaN(total)) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Preencha todos os campos obrigatórios do produto!",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    const invoiceProduct = {
      id: productForm.productId,
      name: product.name,
      quantity,
      value,
      weight,
      total,
      received: false,
      receivedQuantity: 0,
    };

    setCurrentInvoice({
      ...currentInvoice,
      products: [...currentInvoice.products, invoiceProduct],
    });

    setProductForm({
      productId: "",
      price: "",
      quantity: "",
      value: "",
      weight: "",
      total: "",
    });

    setShowProductForm(false);
  };

  const saveInvoice = async () => {
    if (currentInvoice.products.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Adicione pelo menos um produto à invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.number) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe o número da invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.date) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe a data da invoice!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!currentInvoice.supplierId) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione um fornecedor!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
      const dateWithTime = new Date(`${currentInvoice.date}T${time}`);

      const response = await api.post("/invoice/create", {
        ...currentInvoice,
        date: dateWithTime,
        taxaSpEs:
          currentInvoice.taxaSpEs == null || currentInvoice.taxaSpEs === ""
            ? "0"
            : currentInvoice.taxaSpEs.toString().trim(),
      });

      // Verificar se o número foi ajustado automaticamente
      if (response.data?.numberWasAdjusted) {
        const originalNumber = response.data.originalNumber || currentInvoice.number;
        const newNumber = response.data.number;
        
        Swal.fire({
          icon: "info",
          title: "Número Ajustado Automaticamente",
          html: `
            <p>O número da invoice foi ajustado automaticamente devido a duplicidade:</p>
            <p><strong>Número original:</strong> ${originalNumber}</p>
            <p><strong>Novo número:</strong> <span style="color: #2563eb; font-weight: bold;">${newNumber}</span></p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #666;">A invoice foi salva com sucesso!</p>
          `,
          confirmButtonText: "Entendi",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
          },
        });
      } else {
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Invoice salva com sucesso!'
        });
      }

      // Buscar o próximo número de invoice automaticamente
      try {
        const nextNumberResponse = await api.get("/invoice/next-number");
        const nextNumber = nextNumberResponse.data?.nextNumber || `INV-${Date.now()}`;
        
        setCurrentInvoice({
          id: null,
          number: nextNumber,
          date: new Date().toLocaleDateString('en-CA'),
          supplierId: "",
          products: [],
          carrierId: "",
          carrier2Id: "",
          taxaSpEs: 0.0,
          paid: false,
          paidDate: null,
          paidDollarRate: null,
          completed: false,
          completedDate: null,
          amountTaxcarrier: 0,
          amountTaxcarrier2: 0,
          amountTaxSpEs: 0,
          overallValue: 0,
          subAmount: 0,
        });
      } catch (error) {
        console.error("Erro ao buscar próximo número:", error);
        // Em caso de erro, usar número baseado em timestamp
        setCurrentInvoice({
          id: null,
          number: `INV-${Date.now()}`,
          date: new Date().toLocaleDateString('en-CA'),
          supplierId: "",
          products: [],
          carrierId: "",
          carrier2Id: "",
          taxaSpEs: 0.0,
          paid: false,
          paidDate: null,
          paidDollarRate: null,
          completed: false,
          completedDate: null,
          amountTaxcarrier: 0,
          amountTaxcarrier2: 0,
          amountTaxSpEs: 0,
          overallValue: 0,
          subAmount: 0,
        });
      }

      // setCurrentInvoice({
      //   id: null,
      //   number: '',
      //   date: new Date().toISOString().split('T')[0],
      //   supplierId: '',
      //   products: [],
      //   carrierId: '',
      //   carrier2Id: '',
      //   taxaSpEs: 0.0,
      //   paid: false,
      //   paidDate: null,
      //   paidDollarRate: null,
      //   completed: false,
      //   completedDate: null,
      //   amountTaxcarrier: 0,
      //   amountTaxcarrier2: 0,
      //   amountTaxSpEs: 0,
      //   overallValue: 0,
      //   subAmount: 0
      // });
      if (props.onInvoiceSaved) {
        props.onInvoiceSaved();
      }
    } catch (error: any) {
      console.error("Erro ao salvar a invoice:", error);
      
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao salvar a invoice";
      
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: errorMessage,
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    calculateProductTotal();
  }, [productForm.quantity, priceData, weightData, productForm.productId]);

  if (isLoading) {
    return (
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500 mr-2" size={24} />
        <span>Carregando produtos...</span>
      </div>
    );
  }

  const totalQuantidade = currentInvoice.products.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-700">
          <Box className="mr-2 inline" size={18} />
          Produtos
        </h2>
        {!showProductForm && (
          <button
            onClick={() => setShowProductForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center"
            disabled={isSaving}
          >
            <Plus className="mr-1 inline" size={16} />
            Adicionar Produto
          </button>
        )}
      </div>

      {showProductForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Adicionar Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
            <div className="relative md:col-span-2">
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label> */}
              <ProductSearchSelect
                products={products}
                value={productForm.productId}
                onChange={(e: any) => {
                  const selectedProduct = products.find((p) => p.id === e);
                  
                  console.log("Produto selecionado:", selectedProduct);
                  
                  if (selectedProduct) {
                    // Preencher preço automaticamente
                    const price = selectedProduct.priceweightAverage ?? 0;
                    console.log("Preço do produto:", price);
                    const priceString = price > 0 ? price.toString() : "";
                    
                    // Atualizar valorRaw com o preço (sem formatação inicial, será formatado no onBlur)
                    setValorRaw(priceString);
                    
                    // Preencher peso automaticamente
                    const weight = selectedProduct.weightAverage ?? 0;
                    console.log("Peso do produto:", weight);
                    const weightString = weight > 0 ? weight.toString() : "";
                    
                    const newForm = { 
                      ...productForm, 
                      productId: e,
                      value: priceString,
                      weight: weightString
                    };
                    
                    // Recalcular total automaticamente se houver quantidade
                    if (price > 0 && productForm.quantity) {
                      const quantity = parseFloat(productForm.quantity) || 0;
                      const total = quantity * price;
                      newForm.total = total.toFixed(2);
                    }
                    
                    setProductForm(newForm);
                    console.log("Form atualizado:", newForm);
                  } else {
                    setProductForm({ ...productForm, productId: e });
                    setValorRaw("");
                  }
                }}
              ></ProductSearchSelect>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                placeholder="Código"
                value={(() => {
                  const selectedProduct = products.find((p) => p.id === productForm.productId);
                  return selectedProduct?.code || "";
                })()}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  const code = e.target.value.trim();
                  if (code) {
                    const productByCode = products.find((p) => p.code === code || p.code?.toLowerCase() === code.toLowerCase());
                    if (productByCode) {
                      // Preencher produto automaticamente
                      const price = productByCode.priceweightAverage ?? 0;
                      const priceString = price > 0 ? price.toString() : "";
                      setValorRaw(priceString);
                      
                      const weight = productByCode.weightAverage ?? 0;
                      const weightString = weight > 0 ? weight.toString() : "";
                      
                      const newForm = { 
                        ...productForm, 
                        productId: productByCode.id,
                        value: priceString,
                        weight: weightString
                      };
                      
                      if (price > 0 && productForm.quantity) {
                        const quantity = parseFloat(productForm.quantity) || 0;
                        const total = quantity * price;
                        newForm.total = total.toFixed(2);
                      }
                      
                      setProductForm(newForm);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const code = e.currentTarget.value.trim();
                    if (code) {
                      const productByCode = products.find((p) => p.code === code || p.code?.toLowerCase() === code.toLowerCase());
                      if (productByCode) {
                        // Preencher produto automaticamente
                        const price = productByCode.priceweightAverage ?? 0;
                        const priceString = price > 0 ? price.toString() : "";
                        setValorRaw(priceString);
                        
                        const weight = productByCode.weightAverage ?? 0;
                        const weightString = weight > 0 ? weight.toString() : "";
                        
                        const newForm = { 
                          ...productForm, 
                          productId: productByCode.id,
                          value: priceString,
                          weight: weightString
                        };
                        
                        if (price > 0 && productForm.quantity) {
                          const quantity = parseFloat(productForm.quantity) || 0;
                          const total = quantity * price;
                          newForm.total = total.toFixed(2);
                        }
                        
                        setProductForm(newForm);
                      }
                    }
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) => {
                  console.log(e.target.value);
                  setProductForm({ ...productForm, quantity: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="Qtd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário ($)</label>
              <input
                type="text"
                step="0.01"
                value={valorRaw}
                onChange={(e) => {
                  // Permite números, ponto decimal e sinal negativo
                  const cleanedValue = e.target.value.replace(/[^0-9.-]/g, "");

                  // Garante que há apenas um sinal negativo no início
                  let newValue = cleanedValue;
                  if ((cleanedValue.match(/-/g) || []).length > 1) {
                    newValue = cleanedValue.replace(/-/g, "");
                  }

                  // Garante que há apenas um ponto decimal
                  if ((cleanedValue.match(/\./g) || []).length > 1) {
                    const parts = cleanedValue.split(".");
                    newValue = parts[0] + "." + parts.slice(1).join("");
                  }

                  setValorRaw(newValue);

                  // Converte para número para o estado do pagamento
                  const numericValue = parseFloat(newValue) || 0;
                  setProductForm({ ...productForm, value: isNaN(numericValue) ? "" : numericValue.toString() });
                }}

                onBlur={(e) => {
                // Formata apenas se houver valor
                if (valorRaw) {
                  const numericValue = parseFloat(valorRaw);
                  if (!isNaN(numericValue)) {
                    // Formata mantendo o sinal negativo se existir
                    const formattedValue = numericValue.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    setValorRaw(formattedValue);
                    setProductForm({ ...productForm, value: numericValue.toString() });
                    // setValorOperacao(numericValue);
                  }
                }
              }}
              onFocus={(e) => {
                // Remove formatação quando o input recebe foco
                if (valorRaw) {
                  const numericValue = parseFloat(valorRaw.replace(/[^0-9.-]/g, ""));
                  if (!isNaN(numericValue)) {
                    setValorRaw(numericValue.toString());
                  }
                }
              }}

                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="$"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                value={weightData}
                onChange={(e) => {
                  setProductForm({ ...productForm, weight: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="kg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.total}
                readOnly
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="$"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowProductForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded mr-2"
              >
                <X className="mr-1 inline" size={16} />
                Cancelar
              </button>
              <button
                onClick={addProduct}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                <Plus className="mr-1 inline" size={16} />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Invoice: <span className="font-bold">{currentInvoice.number || "-"}</span>
          </span>
          <span className="text-sm text-gray-500">
            Criada em: <span>{new Date().toLocaleDateString("pt-BR")}</span>
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor ($)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (kg)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total ($)
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentInvoice.products.map((product, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    {products.find((item) => item.id === product.id)?.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{product.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {product.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{product.weight.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {product.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => deleteProduct(index)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">Resumo da Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* <div className="bg-white p-3 rounded border">
                <p className="text-sm text-gray-600">Subtotal:</p>
                <p id="subtotal" className="text-lg font-semibold">$ {subTotal.toLocaleString('en-US', {  currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits:2 }) || "0.00"}</p>
              </div> */}
              {/* FRETE 1 */}
              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Frete 1:</p>
                <p className="text-sm text-gray-800 font-semibold">{carrierOneName}</p>
                <p id="shippingCost" className="text-lg font-bold mt-1">
                  ${" "}
                  {amountTaxCarrieFrete1.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>

              {/* FRETE 2 */}
              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Frete 2:</p>
                <p className="text-sm text-gray-800 font-semibold">{carrierTwoName}</p>
                <p id="shippingCost" className="text-lg font-bold mt-1">
                  ${" "}
                  {amountTaxCarrieFrete2.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>

              {/* FRETE SP x ES */}
              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Frete SP x ES:</p>
                <p id="taxCost" className="text-lg font-bold mt-1">
                  R${" "}
                  {taxSpEs.toLocaleString("pt-BR", {
                    currency: "BRL",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>

              {/* TOTAL DE ITENS */}
              <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm text-center">
                <p className="text-sm text-gray-600">Total de Itens (Qtd):</p>
                <p id="taxCost" className="text-lg font-bold mt-1">
                  Qtd {totalQuantidade}
                </p>
              </div>
            </div>

            {/* TOTAL DA INVOICE */}
            <div className="bg-blue-50 p-4 rounded-2xl border shadow-sm mb-3">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
                <p id="invoiceTotal" className="text-xl font-bold text-blue-800">
                  ${" "}
                  {subTotal.toLocaleString("en-US", {
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
            </div>

            {/* TOTAL COM FRETE */}
            <div className="bg-green-50 p-4 rounded-2xl border shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm font-medium text-green-800">Total com frete:</p>
                <p id="invoiceTotal" className="text-xl font-bold text-green-800">
                  ${" "}
                  {totalWithFreight.toLocaleString("pt-BR", {
                    currency: "BRL",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={saveInvoice}
          className="w-full bg-blue-600 mt-4 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2" size={18} />
              Salvar Invoice
            </>
          )}
        </button>
      </div>
    </div>
  );
}
