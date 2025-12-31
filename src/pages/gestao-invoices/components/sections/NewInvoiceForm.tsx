import { FilePlus, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../../../services/api";
import { Invoice } from "../types/invoice";

interface NewInvoiceFormProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: Invoice) => void;
}

export function NewInvoiceForm({ currentInvoice, setCurrentInvoice }: NewInvoiceFormProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [valorRaw, setValorRaw] = useState(""); 
  const [taxaSpEs, setTaxaSpEs] = useState<string>(
    currentInvoice.taxaSpEs === 0 ? "" : currentInvoice.taxaSpEs.toString().replace(".", ",")
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const suppliersResponse = await api.get("/invoice/supplier");
        const carriersResponse = await api.get("/invoice/carriers");
        const productsResponse = await api.get("/invoice/product");

        setSuppliers(suppliersResponse.data);
        setCarriers(carriersResponse.data);
        // O backend agora retorna { products: [...], totalProducts: ..., page: ..., limit: ..., totalPages: ... }
        setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : productsResponse.data.products || []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if(name === "number"){
      console.log(value.toUpperCase())
      setCurrentInvoice({...currentInvoice, [name]: value.toUpperCase()})
      return
    }
    if (name === "taxaSpEs") {
      if (/^[0-9]*[.,]?[0-9]{0,2}$/.test(value)) {
        setTaxaSpEs(value);
        setCurrentInvoice({
          ...currentInvoice,
          taxaSpEs: value.replace(",", "."), // ← string, ponto decimal
        });
      }
    } else {
      setCurrentInvoice({ ...currentInvoice, [name]: value });
    }
  };

  useEffect(()=>{

    if(!currentInvoice.taxaSpEs){
      setValorRaw("")
    }

  },[currentInvoice.taxaSpEs])

  return (
    <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        <FilePlus className="mr-2 inline" size={18} />
        Nova Invoice
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
        <select
          name="supplierId"
          value={currentInvoice.supplierId}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um fornecedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Número da Invoice</label>
        <input
          type="text"
          name="number"
          value={currentInvoice.number}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Número da invoice"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
        <input
          type="date"
          name="date"
          value={currentInvoice.date}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Freteiro</label>
        <select
          name="carrierId"
          value={currentInvoice.carrierId}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um freteiro</option>
          {carriers
            .filter((carrier) => carrier.id !== currentInvoice.carrier2Id)
            .map((carrier) => (
              <option key={carrier.id} value={carrier.id}>
                {carrier.name} ({carrier.type === "percentage" ? "%" : carrier.type === "perKg" ? "$/kg" : "$/un"})
              </option>
            ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Freteiro 2</label>
        <select
          name="carrier2Id"
          value={currentInvoice.carrier2Id}
          onChange={handleInputChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione um freteiro</option>
          {carriers
            .filter((carrier) => carrier.id !== currentInvoice.carrierId)
            .map((carrier) => (
              <option key={carrier.id} value={carrier.id}>
                {carrier.name} ({carrier.type === "percentage" ? "%" : carrier.type === "perKg" ? "$/kg" : "$/un"})
              </option>
            ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Frete SP x ES (R$ por item)</label>
        <input
          type="text"
          inputMode="decimal"
          name="taxaSpEs"
          placeholder="Valor em R$ por item"
          value={valorRaw}
          onChange={(e) => {
                // Permite números, ponto decimal e sinal negativo
                const cleanedValue = e.target.value.replace(/[^0-9,-]/g, "");

                // Garante que há apenas um sinal negativo no início
                let newValue = cleanedValue;
                if ((cleanedValue.match(/-/g) || []).length > 1) {
                  newValue = cleanedValue.replace(/-/g, "");
                }
                // Garante que há apenas um ponto decimal
                if ((cleanedValue.match(/,/g) || []).length > 1) {
                  const parts = cleanedValue.split(",");
                  newValue = parts[0] + "," + parts.slice(1).join("");
                }
                setValorRaw(newValue);
                setCurrentInvoice({
                  ...currentInvoice,
                  taxaSpEs: newValue.replace(",","."), // ← string, ponto decimal
                });
              }}

              onBlur={(e) => {
                // Formata apenas se houver valor
                if (valorRaw) {
                  const numericValue = parseFloat(valorRaw.replace(",","."));
                  if (!isNaN(numericValue)) {
                    // Formata mantendo o sinal negativo se existir
                    const formattedValue = numericValue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    setValorRaw(formattedValue);
                  console.log(currentInvoice)
                  setCurrentInvoice({
                  ...currentInvoice,
                  taxaSpEs: String(numericValue).replace(",","."), // ← string, ponto decimal
                });
                  }
                }
              }}
              onFocus={(e) => {
                // Remove formatação quando o input recebe foco
                if (valorRaw) {
                  const toNumber = valorRaw.replace(",",".")
                  const numericValue = parseFloat(toNumber.replace(/[^0-9.-]/g, ""));
                  if (!isNaN(numericValue)) {
                    setValorRaw(numericValue.toString().replace(".",","));
                  }
                }
              }}

          className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
