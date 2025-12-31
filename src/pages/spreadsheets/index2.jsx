import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { FileText, Edit, Trash2, CornerUpLeft, CornerUpRight, Printer, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useMediaQuery } from "@mui/material";
import SpreadsheetsMobile from './spreadsheetsMobile';
import './style.css';
import { GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import debounce from 'lodash.debounce';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Bar
} from 'recharts';
import {  Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale as ChartCategoryScale,
  LinearScale as ChartLinearScale,
  Tooltip,
  Legend as ChartLegend,
  ArcElement
} from 'chart.js';
import { api } from '../../services/api';

//ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, ChartTooltip, ChartLegend);
ChartJS.register(
  ArcElement,
  Tooltip,
  ChartLegend,
  ChartCategoryScale,
  ChartLinearScale,
  BarElement
);
const excelFonts = [
  'Calibri',
  'Cambria',
  'Candara',
  'Consolas',
  'Constantia',
  'Corbel',
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Palatino Linotype',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
];


const excelFontSizes = [
  8, 9, 10, 11, 12, 14, 16, 18,
  20, 22, 24, 26, 28, 36, 48, 72
];

const Spreadsheets = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cellStyles, setCellStyles] = useState({});
  const [sheets, setSheets] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(-1);
  const [sheetTitle, setSheetTitle] = useState('Planilha sem título');
  const [showEditor, setShowEditor] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const fileInputRef = useRef(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [columnWidths, setColumnWidths] = useState([]); 

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    const savedSheets = await api.get('/sheets/all')
    if (savedSheets) {
      setSheets(savedSheets.data);
    }
  }

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const rows = content.split('\n').map((row, rowIndex) => {
        return row.split(',').map((cell, colIndex) => {
          const match = cell.match(/^"(.*?)(\|font:(.*?)\|size:(.*?))?"$/);
          const value = match?.[1] || '';
          const font = match?.[3] || '';
          const size = match?.[4] || '';
  
          // if (font || size) {
          //   const key = `${rowIndex}-${colIndex}`;
          //   setCellStyles((prev) => ({
          //     ...prev,
          //     [key]: {
          //       fontFamily: font,
          //       fontSize: size,
          //     },
          //   }));
          // }
  
          return value;
        });
      });
  
      setCurrentData(rows);
      setSheetTitle(file.name.replace(/\.csv$/i, ''));
      setShowEditor(true);
      initHistory(rows);
    };
  
    reader.readAsText(file);
  };
  

  const initHistory = (data) => {
    const deepCopyData = JSON.parse(JSON.stringify(data));
    const deepCopyStyles = JSON.parse(JSON.stringify(cellStyles));
    
    setHistory([{ 
      data: deepCopyData, 
      styles: deepCopyStyles 
    }]);
    setHistoryIndex(0);
  };

  const recordHistory = (newData, newStyles = cellStyles) => {
    const deepCopyData = JSON.parse(JSON.stringify(newData));
    const deepCopyStyles = JSON.parse(JSON.stringify(newStyles));
    
    const newHistory = [...history.slice(0, historyIndex + 1), { 
      data: deepCopyData, 
      styles: deepCopyStyles 
    }];
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historyItem = history[newIndex];
      setCurrentData(JSON.parse(JSON.stringify(historyItem.data)));
      setCellStyles(JSON.parse(JSON.stringify(historyItem.styles)));
      setHistoryIndex(newIndex);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historyItem = history[newIndex];
      setCurrentData(JSON.parse(JSON.stringify(historyItem.data)));
      setCellStyles(JSON.parse(JSON.stringify(historyItem.styles)));
      setHistoryIndex(newIndex);
    }
  };


  const handleSave = async (data, title, widths = columnWidths) => {
    const newSheet = { title, rows: data, widths };
  
    if (currentSheetIndex >= 0 && sheets[currentSheetIndex]?.id) {
      // Atualizar planilha existente (PATCH)
      const id = sheets[currentSheetIndex].id;
      try {
        const res = await api.patch(`/sheets/${id}`, 
          newSheet
        );
        const updated =  res.data;
  
        const updatedSheets = [...sheets];
        updatedSheets[currentSheetIndex] = updated;
        setSheets(updatedSheets);
      } catch (err) {
        console.error("Erro ao atualizar:", err);
      }
    } else {
      // Criar nova planilha (POST)
      try {
        console.log("newSheet", newSheet)
        const res = await api.post('/sheets', newSheet);
        console.log("responseSheet", res.data)

  
        setSheets([...sheets, res.data]);
      } catch (err) {
        console.log("error", err)
        console.error("Erro ao salvar:", err);
      }
    }
  
    setShowEditor(false);
  };
  

  const handleSelectSheet = (index) => {
    setCurrentSheetIndex(index);
    const sheetData = [...sheets[index].rows];
    setCurrentData(sheetData);
    setSheetTitle(sheets[index].title);
    setCellStyles(sheets[index].styles || {});
    setColumnWidths(sheets[index].widths || []); // 👈 ADICIONE ISSO AQUI!
    setShowEditor(true);
    
    // Reinicia os estilos e o histórico
    setCellStyles({});
    initHistory(sheetData);
  };
  const handleDeleteSheet = async (id) => {
    try {
      await api.delete(`/sheets/${id}`);
      setSheets(sheets.filter((s) => s.id !== id));
    } catch (err) {
      console.log("error", err)
      console.error("Erro ao deletar:", err);
    }
  };

  const handleDeleteAllSheets = async () => {
    try {
      await api.delete("/sheets/all");
      setSheets([]);
      await fetchSheets()
    } catch (err) {
      console.log("error", err)
      console.error("Erro ao deletar:", err);
    }
  };

  // const exportToCSV = () => {
  //   const csvContent = data
  //     .map((row, rowIndex) =>
  //       row.map((cell, colIndex) => {
  //         const style = cellStyles[`${rowIndex}-${colIndex}`] || {};
  //         const font = style.fontFamily || '';
  //         const size = style.fontSize || '';
  //         return `"${cell}|font:${font}|size:${size}"`;
  //       }).join(',')
  //     )
  //     .join('\n');
  
  //   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //   const url = URL.createObjectURL(blob);
  
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.setAttribute('download', `${sheetTitle || 'planilha'}.csv`);
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  //   URL.revokeObjectURL(url);
  // };

  const handleDuplicateSheet = async (index) => {
    try {
      if (index === null || index === undefined || !sheets[index]) {
        throw new Error("Nenhuma planilha selecionada para duplicar");
      }
  
      const sheetId = sheets[index].id;
      const response = await api.post(`/sheets/${sheetId}/duplicate`);
      
      // Atualiza a lista de planilhas
      setSheets([...sheets, response.data]);
      
      // Opcional: abrir a cópia diretamente
      handleSelectSheet(sheets.length);
      
    } catch (err) {
      console.error("Erro ao duplicar planilha:", err);
      // Adicione aqui a notificação para o usuário se necessário
    }
  };
  
  if (isMobile) {
    return <SpreadsheetsMobile />
  }


  return (
    <div className="bg-gradient-to-b from-blue-50 to-blue-100 text-gray-900 min-h-screen">
      <header className="bg-white shadow-md sticky top-0 z-50 px-4 py-4 flex  justify-between items-center rounded-b-2xl">
        <span className="text-2xl font-bold text-blue-600">BlueSheets</span>
        <div className="flex items-center gap-2">
  <input
    type="file"
    ref={fileInputRef}
    accept=".csv"
    className="hidden"
    onChange={handleImport}
  />
  <button
    onClick={() => fileInputRef.current.click()}
    className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
  >
    Importar
  </button>

  {/* ✅ Aqui está o novo botão Exportar */}
  <button
  onClick={() => {
    if (selectedSheetIndex != null) {
      const selected = sheets[selectedSheetIndex];
      const csvContent = selected.rows
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selected.title || 'planilha'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }}
  className={`bg-purple-600 text-white px-4 py-2 rounded-lg ${selectedSheetIndex == null ? 'opacity-50 pointer-events-none' : ''}`}
>
  Exportar
</button>

  <button
  onClick={() => handleDuplicateSheet(selectedSheetIndex)}
  className={`bg-orange-600 text-white px-4 py-2 rounded-lg ${selectedSheetIndex == null ? 'opacity-50 pointer-events-none' : ''}`}
>
  Duplicar
</button>

<button
  onClick={() => setShowDeleteModal(true)}
  className="bg-red-500 text-white px-4 py-2 rounded-lg"
>
  Apagar Tudo
</button>

          <button
            onClick={() => {
              const newData = Array(50).fill().map(() => Array(5).fill(''));
              setCurrentData(newData);
              setSheetTitle('Planilha sem título');
              setCurrentSheetIndex(-1);
              setShowEditor(true);
              initHistory(newData); // Inicializa o histórico
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Nova planilha 
          </button>
        </div>
      </header>

      {showEditor ? (
        <SheetEditor
          currentData={currentData}
          sheetTitle={sheetTitle}
          onClose={() => setShowEditor(false)}
          onSave={(data, title, widths) => handleSave(data, title, widths)}
          onRename={() => setShowRenameModal(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          recordHistory={recordHistory}
          cellStyles={cellStyles}
          setCellStyles={setCellStyles}
          currentSheetIndex={currentSheetIndex} // 👈 ADICIONE ISSO
          sheets={sheets} // 👈 ADICIONE ISSO
          columnWidths={columnWidths}
          setColumnWidths={setColumnWidths}

        />
      ) : (
        <SheetList
          sheets={sheets}
          onSelect={handleSelectSheet}
          onDelete={handleDeleteSheet}
          onNew={() => {
            setCurrentData(Array(50).fill().map(() => Array(5).fill('')));
            setShowEditor(true);
          }}

          onDuplicate={handleDuplicateSheet}
          onSelectSimple={setSelectedSheetIndex}
          selectedSheetIndex={selectedSheetIndex}
        />
      )}

      {showRenameModal && (
       <RenameModal
       currentName={sheetTitle}
       onClose={() => setShowRenameModal(false)}
       onSave={(newName) => {
         setSheetTitle(newName); // atualiza o título visivelmente
         setSheets((prevSheets) => {
           const updated = [...prevSheets];
           if (currentSheetIndex >= 0) {
             updated[currentSheetIndex].title = newName;
           }
           return updated;
         });
         setShowRenameModal(false);
       }}
     />     
      )}

{showDeleteModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white rounded-lg w-11/12 max-w-sm p-4">
      <h2 className="text-lg font-medium mb-2">Confirmar exclusão</h2>
      <p className="text-gray-700 mb-4">Deseja apagar todas as planilhas salvas?</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="px-4 py-2 rounded bg-gray-200"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            handleDeleteAllSheets()
            setSheets([]);
            setSelectedSheetIndex(null);
            setShowDeleteModal(false);
          }}
          className="px-4 py-2 rounded bg-red-600 text-white"
        >
          Apagar tudo
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

const SheetList = ({ sheets, onSelect, onDelete, onNew, onDuplicate, onSelectSimple, selectedSheetIndex }) => {
  return (
    <main className="p-4">
      {/* <button
        onClick={onNew}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4"
      >
        Nova Planilha
      </button> */}
      <ul className="space-y-3">
        {sheets.map((sheet, i) => (
       <li
       key={i}
       className={`sheet-item bg-white p-4 rounded-xl shadow flex justify-between items-center hover:bg-blue-50 ${
         selectedSheetIndex === i ? 'ring-2 ring-blue-500' : ''
       }`}
       onClick={() => onSelectSimple(i)}
     >
     
            <div>
              <p className="font-semibold text-blue-700">{sheet.title}</p>
              <p className="text-sm text-gray-500">
                {sheet.rows.length} linhas, {sheet.rows[0]?.length || 0} colunas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(i);
                }}
                className="text-blue-600 flex items-center gap-1"
              >
                <Edit size={16} /> Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(sheet.id);
                }}
                className="text-red-500 flex items-center gap-1"
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

const SheetEditor = ({ 
  currentData, 
  sheetTitle, 
  onClose, 
  onSave, 
  onRename,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  recordHistory,
  currentSheetIndex,
  sheets,
  columnWidths, setColumnWidths
}) => {
  const [data, setData] = useState(currentData);
  const [title, setTitle] = useState(sheetTitle);
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellStyles, setCellStyles] = useState({});
  const inputRefs = useRef({});
  const [clipboardData, setClipboardData] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [selectedColumnChart, setSelectedColumnChart] = useState(0);
  const [formulaMode, setFormulaMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [formulaContextMenu, setFormulaContextMenu] = useState({ show: false, x: 0, y: 0 });
  const [formulaToInsert, setFormulaToInsert] = useState(null);
  const [formulaSearch, setFormulaSearch] = useState("");

  useEffect(() => {
    setData(currentData);
  }, [currentData]);

  useEffect(() => {
    setTitle(sheetTitle);
  }, [sheetTitle]);
  
  // Carrega larguras ao editar planilha
useEffect(() => {
  if (currentSheetIndex >= 0 && sheets[currentSheetIndex].widths) {
    setColumnWidths(sheets[currentSheetIndex].widths);
  }
}, [currentSheetIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCell) return;
  
      const [row, col] = selectedCell;
  
      if (e.key === 'Escape') {
        setFormulaMode(false);
        setEditingCell(null);
      }

      // Copiar e colar com Ctrl ou Cmd
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          e.preventDefault();
          setClipboardData(data[row][col]);
          return;
        }
  
        if (e.key === 'v') {
          e.preventDefault();
          const newData = [...data];
          newData[row][col] = clipboardData;
          setData(newData);
          recordHistory(newData);
          return;
        }
      }
  
      // Navegação padrão
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (row + 1 < data.length) handleCellFocus(row + 1, col);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (row - 1 >= 0) handleCellFocus(row - 1, col);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (col + 1 < data[0].length) handleCellFocus(row, col + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (col - 1 >= 0) handleCellFocus(row, col - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (row + 1 < data.length) handleCellFocus(row + 1, col);
          break;
        case 'Tab':
          e.preventDefault();
          if (col + 1 < data[0].length) handleCellFocus(row, col + 1);
          break;
        default:
          break;
      }
    };
  
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, data, clipboardData]);
  
  
  const handleCellChange = (row, col, value) => {
    const newData = [...data];
    newData[row][col] = value;
    setData(newData);
    recordHistory(newData, cellStyles); // Registra histórico com dados e estilos
  };

  // 👇 Atualize sua função handleCellFocus para incluir botão direito
  const handleCellFocus = (row, col, event = null) => {
    setSelectedCell([row, col]);
  
    if (event?.type === 'contextmenu') {
      event.preventDefault();
      setFormulaContextMenu({ show: true, x: event.clientX, y: event.clientY });
      setEditingCell([row, col]);
      return;
    }
  
    setTimeout(() => {
      const el = inputRefs.current[`${row}-${col}`];
      if (el) {
        el.focus();
        if (el.value.startsWith('=')) {
          setFormulaMode(true);
          setEditingCell([row, col]);
        } else {
          setFormulaMode(false);
          setEditingCell(null);
        }
      }
    }, 0);
  };
  
  // ✅ Adicione esse helper para combinar ref de DnD com lógica de onmouseup
  const setThRef = (el, colIndex, provided, columnWidths, setColumnWidths) => {
    if (el) {
      provided.innerRef(el); // aplica o ref do Draggable
      el.onmouseup = () => {
        const newWidths = [...columnWidths];
        newWidths[colIndex] = el.offsetWidth;
        setColumnWidths(newWidths);
      };
    }
  };
  

  const updateStyle = (row, col, styleProp, value) => {
    const key = `${row}-${col}`;
    setCellStyles(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [styleProp]: value,
      }
    }));
  };

  const addRow = () => {
    const newData = [...data, Array(data[0].length).fill('')];
    setData(newData);
    recordHistory(newData);
  };
  
  const removeRow = () => {
    if (data.length > 1) {
      const newData = data.slice(0, -1);
      setData(newData);
      recordHistory(newData);
    }
  };
  const addColumn = () => {
    setData(data.map(row => [...row, '']));
  };

  const removeColumn = () => {
    if (data[0].length > 1) {
      setData(data.map(row => row.slice(0, -1)));
    }
  };

  function calculateFormula(formula) {
    formula = formula.substring(1).trim().toUpperCase();
   // formula = formula.toUpperCase(); // 🔥 ignora maiúsculas/minúsculas
  
    try {

      // =DIVIDIR(...)
      if (formula.startsWith('DIVIDIR(')) {
        const inside = formula.match(/\(([^)]+)\)/)?.[1];
        if (!inside) return formula;
        const refs = inside.split(';').map(ref => ref.trim());
        const values = refs.map(ref => evaluateCellExpression(ref));
        const result = values.reduce((acc, val) => (parseFloat(val) !== 0 ? acc / (parseFloat(val) || 1) : acc));
      
        const allReais = refs.every(ref => {
          const col = ref.charCodeAt(0) - 65;
          const row = parseInt(ref.substring(1)) - 1;
          return currentData[row]?.[col]?.includes('R$');
        });
      
        const allDollar = refs.every(ref => {
          const col = ref.charCodeAt(0) - 65;
          const row = parseInt(ref.substring(1)) - 1;
          return currentData[row]?.[col]?.includes('$') && !currentData[row][col].includes('R$');
        });
      
        if (allReais) return `R$ ${result.toFixed(2).replace('.', ',')}`;
        if (allDollar) return `$ ${result.toFixed(2).replace('.', ',')}`;
        return result;
      }

// =MULT(A1;B1;C2;E5)
if (formula.startsWith('MULT(')) {
  const inside = formula.match(/\(([^)]+)\)/)?.[1];
  if (!inside) return formula;
  const refs = inside.split(';').map(ref => ref.trim());
  const values = refs.map(ref => evaluateCellExpression(ref));
  const product = values.reduce((acc, val) => acc * (parseFloat(val) || 0), 1);

  const allReais = refs.every(ref => {
    const col = ref.charCodeAt(0) - 65;
    const row = parseInt(ref.substring(1)) - 1;
    return currentData[row]?.[col]?.includes('R$');
  });

  const allDollar = refs.every(ref => {
    const col = ref.charCodeAt(0) - 65;
    const row = parseInt(ref.substring(1)) - 1;
    return currentData[row]?.[col]?.includes('$') && !currentData[row][col].includes('R$');
  });

  if (allReais) return `R$ ${product.toFixed(2).replace('.', ',')}`;
  if (allDollar) return `$ ${product.toFixed(2).replace('.', ',')}`;
  return product;
}

// =SUB(A1;B1;C2;E5)
if (formula.startsWith('SUB(')) {
  const inside = formula.match(/\(([^)]+)\)/)?.[1];
  if (!inside) return formula;
  const refs = inside.split(';').map(ref => ref.trim());
  const values = refs.map(ref => evaluateCellExpression(ref));
  const result = values.reduce((acc, val) => acc - (parseFloat(val) || 0));

  const allReais = refs.every(ref => {
    const col = ref.charCodeAt(0) - 65;
    const row = parseInt(ref.substring(1)) - 1;
    return currentData[row]?.[col]?.includes('R$');
  });

  const allDollar = refs.every(ref => {
    const col = ref.charCodeAt(0) - 65;
    const row = parseInt(ref.substring(1)) - 1;
    return currentData[row]?.[col]?.includes('$') && !currentData[row][col].includes('R$');
  });

  if (allReais) return `R$ ${result.toFixed(2).replace('.', ',')}`;
  if (allDollar) return `$ ${result.toFixed(2).replace('.', ',')}`;
  return result;
}

      // =SE(condição; verdadeiro; falso)
      if (formula.startsWith('SE(')) {
        const inside = formula.match(/\((.*)\)/)?.[1];
        if (!inside) throw new Error('Sintaxe SE inválida');
        const [cond, valTrue, valFalse] = inside.split(';').map((s) => s.trim());
  
        const condEval = evaluateCellExpression(cond);
        return condEval ? valTrue : valFalse;
      }
  
    // =SOMA(A1:B3) ou SOMA(A1;B3)
    if (formula.startsWith('SOMA(')) {
      const inside = formula.match(/\(([^)]+)\)/)?.[1];
      if (!inside) return formula;
      const refs = inside.split(/[:;]/).map(ref => ref.trim());
      const values = refs.map((ref) => evaluateCellExpression(ref));
      const total = values.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    
      const allReais = refs.every(ref => {
        const col = ref.charCodeAt(0) - 65;
        const row = parseInt(ref.substring(1)) - 1;
        return currentData[row]?.[col]?.includes('R$');
      });
    
      const allDollar = refs.every(ref => {
        const col = ref.charCodeAt(0) - 65;
        const row = parseInt(ref.substring(1)) - 1;
        return currentData[row]?.[col]?.includes('$') && !currentData[row][col].includes('R$');
      });
    
      if (allReais) return `R$ ${total.toFixed(2).replace('.', ',')}`;
      if (allDollar) return `$ ${total.toFixed(2).replace('.', ',')}`;
    
      return total;
    }
    

// =MÉDIA(A1:B3) ou MEDIA(A1;B3)
if (formula.startsWith('MÉDIA(') || formula.startsWith('MEDIA(')) {
  const inside = formula.match(/\(([^)]+)\)/)?.[1];
  if (!inside) return formula;
  const [start, end] = inside.split(/[:;]/).map(s => s.trim());
  if (!start || !end) return formula;
  return averageFromRange(`${start}:${end}`);
}

  
      // =PROCV(valor; intervalo; coluna)
      if (formula.startsWith('PROCV(')) {
        const inside = formula.match(/\(([^)]+)\)/)?.[1];
        if (!inside) throw new Error('Sintaxe PROCV inválida');
  
        const [lookupValueRaw, rangeRaw, columnIndexRaw] = inside.split(';').map(s => s.trim());
        const lookupValue = evaluateCellExpression(lookupValueRaw);
        const columnIndex = parseInt(columnIndexRaw) - 1;
  
        const [startCell, endCell] = rangeRaw.split(':');
        const startCol = startCell.charCodeAt(0) - 65;
        const startRow = parseInt(startCell.substring(1)) - 1;
        const endCol = endCell.charCodeAt(0) - 65;
        const endRow = parseInt(endCell.substring(1)) - 1;
  
        for (let row = startRow; row <= endRow; row++) {
          const cellValue = currentData[row]?.[startCol];
          if (String(cellValue).toLowerCase() === String(lookupValue).toLowerCase()) {
            return currentData[row]?.[startCol + columnIndex] || '';
          }
        }
  
        return 'Não encontrado';
      }
  
      function sumFromRange(range) {
        const [startCell, endCell] = range.split(':');
        const startRow = parseInt(startCell.substring(1)) - 1;
        const startCol = startCell.charCodeAt(0) - 65;
        const endRow = parseInt(endCell.substring(1)) - 1;
        const endCol = endCell.charCodeAt(0) - 65;
      
        let sum = 0;
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            sum += parseFloat(currentData[row]?.[col]) || 0;
          }
        }
        return sum;
      }
      
      function averageFromRange(range) {
        const [startCell, endCell] = range.split(':');
        const startRow = parseInt(startCell.substring(1)) - 1;
        const startCol = startCell.charCodeAt(0) - 65;
        const endRow = parseInt(endCell.substring(1)) - 1;
        const endCol = endCell.charCodeAt(0) - 65;
      
        let sum = 0, count = 0;
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const val = parseFloat(currentData[row]?.[col]);
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          }
        }
        return count > 0 ? sum / count : 0;
      }    

      // Expressões diretas como =A1+B2*3
      return evaluateCellExpression(formula);
  
    } catch (err) {
      console.error('Erro na fórmula:', err.message);
      return 'Erro';
    }
  }
  

  function evaluateCellExpression(expr) {
    const cleanedExpr = expr.replace(/[A-Z]+[0-9]+/g, (match) => {
      const col = match.charCodeAt(0) - 65;
      const row = parseInt(match.substring(1)) - 1;
      let val = currentData[row]?.[col] ?? '';
  
      if (typeof val === 'string') {
        val = val
          .replace(/[^\d.,-]/g, '') // remove símbolos como R$, %, $
          .replace(',', '.');
      }
  
      return parseFloat(val) || 0;
    });
  
    return eval(cleanedExpr);
  }
  
  function getCellDisplayValue(val) {
    if (typeof val === 'string' && val.trim().startsWith('=')) {
      try {
        return calculateFormula(val);
      } catch (err) {
        return 'Erro';
      }
    }
    return val;
  }  
  
  return (
    <section className="p-4 bg-gray-100">
      <div className="bg-white px-4 py-2 flex justify-between items-center border-b mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-lg">{title}</span>
          <button 
            onClick={onRename}
            className="ml-2 text-sm text-blue-600 hover:underline"
          >
            Editar nome
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="bg-green-200 text-green-800 px-2 py-1 rounded"
          >
            + Linha
          </button>
          <button
            onClick={removeRow}
            className="bg-red-200 text-red-800 px-2 py-1 rounded"
          >
            - Linha
          </button>
          <button
            onClick={addColumn}
            className="bg-green-200 text-green-800 px-2 py-1 rounded"
          >
            + Coluna
          </button>
          <button
            onClick={removeColumn}
            className="bg-red-200 text-red-800 px-2 py-1 rounded"
          >
            - Coluna
          </button>
          <button
            onClick={() => onSave(data, title, columnWidths)}
            className="bg-green-600 text-white px-4 py-1 rounded-lg"
          >
            Salvar
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-1 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="bg-white border-b px-4 py-2 flex flex-wrap gap-2 mb-4 text-sm">
  <button 
    onClick={onUndo} 
    disabled={!canUndo}
    className={`hover:bg-gray-200 p-1 rounded ${!canUndo ? 'opacity-50' : ''}`}
  >
    <CornerUpLeft className="w-4 h-4" />
  </button>
  <button 
    onClick={onRedo} 
    disabled={!canRedo}
    className={`hover:bg-gray-200 p-1 rounded ${!canRedo ? 'opacity-50' : ''}`}
  >
    <CornerUpRight className="w-4 h-4" />
  </button>
  <button
    onClick={() => window.print()}
    className="hover:bg-gray-200 p-1 rounded"
  >
    <Printer className="w-4 h-4" />
  </button>

  <select
    className="border rounded px-2 py-1 text-sm w-24 sm:w-32"
    onChange={(e) => {
      if (selectedCell) {
        const [row, col] = selectedCell;
        updateStyle(row, col, 'fontFamily', e.target.value);
      }
    }}
  >
    {excelFonts.map(font => (
      <option key={font} value={font}>{font}</option>
    ))}
  </select>

  <select
    className="border rounded px-2 py-1 text-sm w-24 sm:w-32"
    onChange={(e) => {
      if (selectedCell) {
        const [row, col] = selectedCell;
        updateStyle(row, col, 'fontSize', `${e.target.value}px`);
      }
    }}
  >
    {excelFontSizes.map(size => (
      <option key={size} value={size}>{size}</option>
    ))}
  </select>

  <button className="font-bold" onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'fontWeight', cellStyles[`${row}-${col}`]?.fontWeight === 'bold' ? 'normal' : 'bold');
    }
  }}>B</button>

  <button className="italic" onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'fontStyle', cellStyles[`${row}-${col}`]?.fontStyle === 'italic' ? 'normal' : 'italic');
    }
  }}>I</button>

  <button className="underline" onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'textDecoration', cellStyles[`${row}-${col}`]?.textDecoration === 'underline' ? 'none' : 'underline');
    }
  }}>U</button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      const val = parseFloat(data[row][col].replace(/[^\d.-]/g, '')) || 0;
      handleCellChange(row, col, `R$ ${val.toFixed(2).replace('.', ',')}`);
    }
  }}>R$</button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      const val = parseFloat(data[row][col].replace(/[^\d.-]/g, '')) || 0;
      handleCellChange(row, col, `$ ${val.toFixed(2).replace('.', ',')}`);
    }
  }}>$</button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      const val = parseFloat(data[row][col].replace(/[^\d.-]/g, '')) || 0;
      handleCellChange(row, col, `${(val * 100).toFixed(0)}%`);
    }
  }}>100%</button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      const val = parseFloat(data[row][col].replace(/[^\d.-]/g, '')) || 0;
      handleCellChange(row, col, val.toFixed(2));
    }
  }}>.00</button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'textAlign', 'left');
    }
  }}>
    <AlignLeft className="w-4 h-4" />
  </button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'textAlign', 'center');
    }
  }}>
    <AlignCenter className="w-4 h-4" />
  </button>

  <button onClick={() => {
    if (selectedCell) {
      const [row, col] = selectedCell;
      updateStyle(row, col, 'textAlign', 'right');
    }
  }}>
    <AlignRight className="w-4 h-4" />
  </button>

  {/* Botão de gráfico + dropdown */}
  <button
    className="bg-indigo-500 text-white px-2 py-1 rounded"
    onClick={() => setShowChart(!showChart)}
  >
    {showChart ? 'Ocultar Gráfico' : 'Ver Gráfico'}
  </button>

  {showChart && (
    <select
      onChange={(e) => setSelectedColumnChart(Number(e.target.value))}
      className="border px-2 py-1 rounded text-sm"
    >
      {data[0]?.map((_, colIdx) => (
        <option key={colIdx} value={colIdx}>
          Coluna {String.fromCharCode(65 + colIdx)}
        </option>
      ))}
    </select>
  )}
</div>


      {showChart && (
  <div className="bg-white p-4 mt-6 rounded-lg shadow">
    <h2 className="text-lg font-semibold mb-4">Gráfico de Coluna A</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.map((row, i) => ({
        name: `Linha ${i + 1}`,
        valor: parseFloat(row[0]) || 0,
      }))}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="valor" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}



      <div className="overflow-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
        <DragDropContext
  onDragEnd={({ source, destination }) => {
    if (!destination) return;
    const from = source.index;
    const to = destination.index;

    const reordered = data.map((row) => {
      const newRow = [...row];
      const [moved] = newRow.splice(from, 1);
      newRow.splice(to, 0, moved);
      return newRow;
    });

    setData(reordered);
    recordHistory(reordered);
  }}
>
  <Droppable droppableId="columns" direction="horizontal" type="column">
    {(provided) => (
      <thead className="bg-gray-100 sticky top-0" ref={provided.innerRef} {...provided.droppableProps}>
        <tr>
          <th className="border p-2">#</th>
          {data[0]?.map((_, colIndex) => (
           <Draggable key={colIndex} draggableId={`col-${colIndex}`} index={colIndex}>
           {(provided) => (
             <th
             ref={(el) => setThRef(el, colIndex, provided, columnWidths, setColumnWidths)}
             style={{ width: columnWidths[colIndex] || 'auto' }}
             {...provided.draggableProps}
             {...provided.dragHandleProps}
               className="border px-4 py-2 text-center bg-gray-100 min-w-[80px] resize-x overflow-auto"
             >
               <GripVertical className="inline-block mr-1 text-gray-400" />
               {String.fromCharCode(65 + colIndex)}
             </th>
           )}
         </Draggable>
          ))}
          {provided.placeholder}
        </tr>
      </thead>
    )}
  </Droppable>
</DragDropContext>
<tbody>
  {data.map((row, rowIndex) => (
    <tr key={rowIndex}>
      <td className="border p-1 bg-gray-100 text-center">{rowIndex + 1}</td>
      {row.map((cell, colIndex) => {
        const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
        return (
          <td
            key={colIndex}
            className={`border p-1 relative ${isSelected ? 'outline outline-blue-500 outline-2 z-10' : ''}`}
            onClick={() => {
              if (
                formulaMode &&
                editingCell &&
                !(editingCell[0] === rowIndex && editingCell[1] === colIndex)
              ) {
                const [editRow, editCol] = editingCell;
                const ref = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
                const current = data[editRow][editCol] || "=";
            
                let updated = current;
                if (updated === "=" || updated.endsWith("=")) {
                  updated += ref;
                } else {
                  updated += "+" + ref;
                }
                
            
                handleCellChange(editRow, editCol, updated);
                handleCellFocus(editRow, editCol);
              } else {
                handleCellFocus(rowIndex, colIndex);
              }
            }} 
            onContextMenu={(e) => handleCellFocus(rowIndex, colIndex, e)}

             >
            <input
              ref={(el) => {
                if (el) inputRefs.current[`${rowIndex}-${colIndex}`] = el;
              }}
              type="text"
              className="cell w-full text-center bg-transparent focus:outline-none transition-all duration-75"
              style={cellStyles[`${rowIndex}-${colIndex}`] || {}}
              value={getCellDisplayValue(cell)}
              onChange={(e) => {
                const val = e.target.value;
              
                handleCellChange(rowIndex, colIndex, val); // Sempre atualiza valor bruto
              
                if (val === "=" || val.startsWith("=")) {
                  setFormulaMode(true);
                  setEditingCell([rowIndex, colIndex]);
                } else {
                  setFormulaMode(false);
                  setEditingCell(null);
                }
              }}    
              onBlur={() => {
                let val = data[rowIndex][colIndex];
                const functions = ['SOMA', 'MULT', 'SUB', 'DIVIDIR', 'MÉDIA', 'MEDIA', 'PROCV', 'SE'];
                const startsWithFn = functions.find(f => val?.toUpperCase().startsWith(f + '('));
              
                if (startsWithFn && !val.startsWith('=')) {
                  val = '=' + val;
                  handleCellChange(rowIndex, colIndex, val);
                }
              
                if (typeof val === 'string' && val.startsWith('=')) {
                  setFormulaMode(false);
                  setEditingCell(null);
                }
              }}
                                                
              onFocus={() => handleCellFocus(rowIndex, colIndex)}
            />
          </td>
        );
      })}
    </tr>
  ))}
</tbody>

        </table>
      </div>
      {/* {showChart && (
  <ChartView data={data} selectedColumn={selectedColumnChart} />
)} */}

{showChart && (
  <>
    <ChartView data={data} selectedColumn={selectedColumnChart} />
    <PieChartView data={data} selectedColumn={selectedColumnChart} />
  </>
)}

{formulaContextMenu.show && (
  <div
    className="fixed z-50 bg-white border rounded shadow p-2 text-sm w-64"
    style={{ top: formulaContextMenu.y, left: formulaContextMenu.x }}
    onMouseLeave={() => setFormulaContextMenu({ show: false, x: 0, y: 0 })}
  >
    <p className="font-semibold mb-1 text-gray-700">Inserir fórmula</p>
    <input
      type="text"
      placeholder="Buscar fórmula..."
      value={formulaSearch}
      onChange={(e) => setFormulaSearch(e.target.value)}
      className="w-full px-2 py-1 border rounded text-sm mb-2"
    />
    {[{
      icon: 'FunctionSquare', label: 'SOMA(A;B)', value: 'SOMA'
    }, {
      icon: 'EqualNot', label: 'MEDIA(A;B)', value: 'MEDIA'
    }, {
      icon: 'Minus', label: 'SUB(A;B)', value: 'SUB'
    }, {
      icon: 'X', label: 'MULT(A;B)', value: 'MULT'
    }, {
      icon: 'Divide', label: 'DIVIDIR(A;B)', value: 'DIVIDIR'
    }, {
      icon: 'Search', label: 'PROCV(valor;intervalo;coluna)', value: 'PROCV'
    }, {
      icon: 'CheckCircle', label: 'SE(condição;verdadeiro;falso)', value: 'SE'
    }]
      .filter(f => f.label.toLowerCase().includes(formulaSearch.toLowerCase()))
      .map((f) => (
        <button
          key={f.value}
          className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-blue-100"
          onClick={() => {
            if (editingCell) {
              const [row, col] = editingCell;
              handleCellChange(row, col, `=${f.value}()`);
              setFormulaContextMenu({ show: false, x: 0, y: 0 });
              setFormulaMode(false);
              setEditingCell(null);
            }
          }}
        >
                  <span className="w-4 h-4 text-blue-600">{React.createElement(require('lucide-react')[f.icon], { size: 16, className: "text-blue-600" })}
           </span>
                  {f.label}
        </button>
      ))}
  </div>
)}




    </section>
  );
};

const RenameModal = ({ currentName, onClose, onSave }) => {
  const [newName, setNewName] = useState(currentName);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-11/12 max-w-sm p-4">
        <h2 className="text-lg font-medium mb-2">Novo nome da planilha</h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-300 rounded w-full p-2 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(newName);
              onClose();
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

const ChartView = ({ data, selectedColumn }) => {
  const chartData = data.map((row, i) => ({
    name: `Linha ${i + 1}`,
    valor: parseFloat(row[selectedColumn]) || 0,
  }));

  return (
    <div className="w-full h-96 bg-white p-4 rounded shadow mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip />
          <RechartsLegend />
          <Bar dataKey="valor" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const PieChartView = ({ data, selectedColumn }) => {
  const valores = data
    .map(row => row[selectedColumn])
    .filter(val => val && !isNaN(parseFloat(val)))
    .map(val => parseFloat(val));

  const labels = valores.map((_, i) => `Linha ${i + 1}`);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Distribuição',
        data: valores,
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#ec4899', '#14b8a6', '#f43f5e', '#22c55e', '#eab308'
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="w-full bg-white p-4 mt-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Gráfico de Pizza</h2>
      <Pie data={chartData} />
    </div>
  );
};

export default Spreadsheets;