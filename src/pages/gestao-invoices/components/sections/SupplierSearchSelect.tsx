import { useEffect, useRef, useState } from "react";

interface Product {
  id: string;
  name: string;
  code?: string;
}

interface Props {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  inline?: boolean; // Prop para usar em layout inline
}

export function ProductSearchSelect({ products, value, onChange, inline = false }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = products
    .filter(p => {
      const searchLower = searchTerm.toLowerCase().trim();
      if (!searchLower) return true;
      
      // Busca por nome ou código
      const nameLower = p.name.toLowerCase();
      const codeLower = p.code?.toLowerCase() || "";
      const words = nameLower.split(/\s+/);
      
      // Verifica se alguma palavra começa com o termo de busca OU se o código corresponde
      return words.some(word => word.startsWith(searchLower)) || 
             nameLower.startsWith(searchLower) ||
             codeLower === searchLower ||
             codeLower.startsWith(searchLower);
    })
    .slice(0, 20); // Limita a 20 resultados para melhor performance

  const selectedName = products.find(p => p.id === value)?.name || "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${inline ? 'mb-0' : 'mb-1'}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>

      <div
        className="w-full border border-gray-300 rounded-md p-2 bg-white cursor-pointer flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedName || "Selecione um produto"}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full border border-gray-300 bg-white rounded shadow">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border-b border-gray-200 focus:outline-none"
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map(product => (
              <li
                key={product.id}
                onClick={() => {
                  onChange(product.id);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
              >
                {product.name}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-gray-500 text-sm">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
