import { ReactNode, useEffect, useRef, useState, KeyboardEvent } from "react";
import { createRoot } from "react-dom/client";

interface GenericSearchSelectProps<T> {
  items: T[];
  value: string;
  getLabel: (item: T) => ReactNode;
  getId: (item: T) => string;
  onChange: (value: string) => void;
  label?: string;
  getSearchString?: (item: T) => string; // Nova prop
  placeholder?: string;
}

export function GenericSearchSelect<T>({
  items = [],
  value,
  onChange,
  getLabel,
  getId = (item: any) => item?.id ?? '',
  label = "Selecione",
  placeholder = "Buscar...",
  getSearchString, // Nova prop
}: GenericSearchSelectProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Filtra itens válidos e converte labels para string
  const getLabelAsString = (item: T): string => {
    if (!item) return '';
    const labelContent = getLabel(item);
    
    if (typeof labelContent === 'string') return labelContent;
    
    // Cria um elemento temporário para renderização
    const tempDiv = document.createElement('div');
    const root = createRoot(tempDiv);
    root.render(<>{labelContent}</>);
    
    return tempDiv.textContent || '';
  };

  const filteredItems = items
    .filter(item => item !== undefined && item !== null)
    .filter(item => {
      const str = getSearchString ? getSearchString(item) : getLabelAsString(item);
      return str.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const selectedItem = items.find(item => item && getId(item) === value);
  const selectedLabel = selectedItem ? getLabel(selectedItem) : label;

  // Fecha o dropdown quando clica fora ou pressiona Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown as any);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown as any);
    };
  }, []);

  // Foca no input quando o dropdown abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchTerm("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIndex = (focusedIndex + 1) % filteredItems.length;
        setFocusedIndex(nextIndex);
        scrollIntoView(nextIndex);
        break;
      
      case "ArrowUp":
        e.preventDefault();
        const prevIndex = (focusedIndex - 1 + filteredItems.length) % filteredItems.length;
        setFocusedIndex(prevIndex);
        scrollIntoView(prevIndex);
        break;
      
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
          selectItem(filteredItems[focusedIndex]);
        } else if (filteredItems.length === 1) {
          selectItem(filteredItems[0]);
        }
        break;
      
      case "Tab":
        closeDropdown();
        break;
      
      default:
        if (filteredItems.length > 0 && focusedIndex === -1) {
          setFocusedIndex(0);
        }
        break;
    }
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current && index >= 0 && index < filteredItems.length) {
      const item = listRef.current.children[index] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  };

  const selectItem = (item: T) => {
    if (!item) return;
    onChange(getId(item));
    closeDropdown();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setFocusedIndex(e.target.value ? 0 : -1);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        className="w-full border border-gray-300 rounded-md p-2 bg-white cursor-pointer flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
          setFocusedIndex(-1);
        }}
      >
        {selectedLabel || label}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full border border-gray-300 bg-white rounded shadow-lg">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            className="w-full p-2 border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          />
          
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto"
            role="listbox"
            
            aria-activedescendant={focusedIndex >= 0 ? getId(filteredItems[focusedIndex]) : undefined}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <li
                  key={getId(item)}
                  id={getId(item)}
                  role="option"
                  aria-selected={index === focusedIndex}
                  onClick={() => selectItem(item)}
                  className={`px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm flex items-center ${
                    index === focusedIndex ? "bg-blue-200" : ""
                  }`}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {getLabel(item)}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-500 text-sm">Nenhum resultado encontrado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}