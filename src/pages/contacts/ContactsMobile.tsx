import { useEffect, useState, useRef } from "react";
import { api } from "../../services/api";
import Header from "../../components/Header";
import { Alert, Snackbar, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import DevicesIcon from "@mui/icons-material/Devices";

interface RowData {
  userName: string;
  id: number;
  name: string;
  age: number;
  accessLevel: "admin" | "manager" | "user";
  connectedDevices: number;
  status: string;
  created_at: string;
  blocked: boolean;
  counter: number;
  role: string;
  devices: { type: string; browser: string; lastActive: string }[];
}

const ContactsMobile: React.FC = () => {
  // Estado para armazenar os dados da API
  const [rows, setRows] = useState<RowData[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"error" | "success" | "info" | "warning">("info");
  const [search, setSearch] = useState("");
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RowData | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleClose = () => {
    setOpen(false);
  };

  // Função para abrir modal de dispositivos
  const handleOpenDevicesModal = (user: RowData) => {
    setSelectedUser(user);
    setDeviceModalOpen(true);
  };
  const handleCloseDevicesModal = () => {
    setDeviceModalOpen(false);
    setSelectedUser(null);
  };
  // Função para remover dispositivo
  const handleRemoveDevice = (userName: string, deviceType: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.userName !== userName) return row;
        const newDevices = row.devices.filter((d: any) => d.type !== deviceType);
        return {
          ...row,
          devices: newDevices,
          connectedDevices: newDevices.length,
        };
      })
    );
    if (selectedUser) {
      const newDevices = selectedUser.devices.filter((d: any) => d.type !== deviceType);
      setSelectedUser({
        ...selectedUser,
        devices: newDevices,
        connectedDevices: newDevices.length,
      });
    }
  };

  // Função para resetar dispositivos (mockada)
  const handleResetDevices = (userName: string) => {
    const user = rows.find((r) => r.userName === userName);
    if (user) {
      handleOpenDevicesModal(user);
    }
  };

  // Função que será chamada ao clicar no botão de delete
  const handleDelete = async (userName: string) => {
    try {
      const token = localStorage.getItem("@backoffice:token");
      if (!token) {
        setMessage("Token não encontrado!");
        setSeverity("error");
        setOpen(true);
        return;
      }
      await api.delete("/graphic/delete", {
        data: { userName },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows((prevRows) => prevRows.filter((row) => row.userName !== userName));
      setMessage(`Usuário ${userName} excluído com sucesso.`);
      setSeverity("success");
      setOpen(true);
    } catch (error) {
      setMessage(`Erro ao excluir o usuário ${userName}.`);
      setSeverity("error");
      setOpen(true);
    }
  };

  // Ajustar mock dos devices para ser coerente com connectedDevices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");
        if (!token) {
          setMessage("Token não encontrado!");
          setSeverity("error");
          setOpen(true);
          return;
        }
        const response = await api.get("/graphic", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const formattedRows = response.data.map((item: any, index: number) => {
          const connectedDevices = Math.floor(Math.random() * 3);
          let devices: { type: string; browser: string; lastActive: string }[] = [];
          if (connectedDevices === 2) {
            devices = [
              { type: "PC", browser: "Chrome", lastActive: "10/07/2025 18:24:14" },
              { type: "Mobile", browser: "Safari", lastActive: "09/07/2025 12:10:00" },
            ];
          } else if (connectedDevices === 1) {
            devices = [
              Math.random() > 0.5
                ? { type: "PC", browser: "Chrome", lastActive: "10/07/2025 18:24:14" }
                : { type: "Mobile", browser: "Safari", lastActive: "09/07/2025 12:10:00" },
            ];
          }
          return {
            id: index + 1,
            name: item.name,
            userName: item.userName,
            status: item.status,
            created_at: item.created_at,
            blocked: item.blocked,
            counter: item.counter,
            role: item.role === "MANAGER" ? "LÍDER DE GRUPOS" : "USUÁRIO",
            connectedDevices: devices.length,
            devices,
          };
        });
        setRows(formattedRows);
      } catch (error) {
        setMessage("Erro ao buscar dados!");
        setSeverity("error");
        setOpen(true);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={isDark ? "p-2 bg-neutral-900 min-h-screen" : "p-2 bg-neutral-100 min-h-screen"}>
      <Header title="Usuários" subtitle="Gerenciamento total de usuários" />
      <div className="relative w-full mb-4 mt-2 max-w-full">
        <input
          type="text"
          placeholder="Buscar por nome de usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={
            isDark
              ? "w-full px-3 pr-10 py-2 rounded-lg bg-neutral-800 text-white placeholder:text-neutral-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-600 transition"
              : "w-full px-3 pr-10 py-2 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-green-600 transition"
          }
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-2-2" />
          </svg>
        </span>
      </div>
      <div className="flex flex-col gap-4 mt-2">
        {rows
          .filter((row) => row.userName.toLowerCase().includes(search.toLowerCase()))
          .map((row) => (
            <div
              key={row.userName}
              className={
                isDark
                  ? "bg-neutral-800 rounded-xl shadow-md p-4 flex flex-col gap-2 border border-neutral-700"
                  : "bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 border border-neutral-200"
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    isDark ? "text-xs text-neutral-400 font-semibold" : "text-xs text-neutral-500 font-semibold"
                  }
                >
                  Nº {row.id}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded font-bold ${
                    row.status === "active"
                      ? isDark
                        ? "bg-green-700 text-white"
                        : "bg-green-500 text-white"
                      : isDark
                      ? "bg-red-700 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className={isDark ? "text-base font-bold text-white" : "text-base font-bold text-neutral-900"}>
                  {row.name}
                </span>
                <span className={isDark ? "text-sm text-neutral-300" : "text-sm text-neutral-600"}>
                  Usuário: <span className="font-medium">{row.userName}</span>
                </span>
                <span className={isDark ? "text-sm text-neutral-300" : "text-sm text-neutral-600"}>
                  Tipo: <span className="font-medium">{row.role}</span>
                </span>
                <span className={isDark ? "text-sm text-neutral-300" : "text-sm text-neutral-600"}>
                  Criado em: <span className="font-medium">{new Date(row.created_at).toLocaleDateString()}</span>
                </span>
                <span className={isDark ? "text-sm text-neutral-300" : "text-sm text-neutral-600"}>
                  Bloqueado: <span className="font-medium">{row.blocked ? "Sim" : "Não"}</span>
                </span>
                <span className={isDark ? "text-sm text-neutral-300" : "text-sm text-neutral-600"}>
                  Contador: <span className="font-medium">{row.counter}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <DevicesIcon className={isDark ? "text-neutral-400" : "text-neutral-500"} fontSize="small" />
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    row.connectedDevices === 0
                      ? isDark
                        ? "bg-neutral-700 text-neutral-300"
                        : "bg-neutral-200 text-neutral-500"
                      : row.connectedDevices === 1
                      ? isDark
                        ? "bg-yellow-600 text-white"
                        : "bg-yellow-400 text-white"
                      : isDark
                      ? "bg-green-600 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {row.connectedDevices}/2 conectados
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  className={
                    isDark
                      ? "flex-1 flex items-center justify-center gap-1 rounded-lg border border-yellow-500 text-yellow-400 py-2 font-semibold text-xs active:scale-95 transition bg-transparent hover:bg-yellow-900"
                      : "flex-1 flex items-center justify-center gap-1 rounded-lg border border-yellow-400 text-yellow-600 py-2 font-semibold text-xs active:scale-95 transition bg-transparent hover:bg-yellow-100"
                  }
                  onClick={() => handleResetDevices(row.userName)}
                >
                  <RefreshIcon fontSize="small" className="mr-1" />
                  <span className="flex flex-col leading-tight text-xs">
                    <span>Limpar</span>
                    <span>Dispositivos</span>
                  </span>
                </button>
                <button
                  className={
                    isDark
                      ? "flex-1 flex items-center justify-center rounded-lg border border-none bg-red-600 text-white py-2 font-semibold text-xs active:scale-95 transition hover:bg-red-700"
                      : "flex-1 flex items-center justify-center rounded-lg border border-none bg-red-500 text-white py-2 font-semibold text-xs active:scale-95 transition hover:bg-red-600"
                  }
                  onClick={() => handleDelete(row.userName)}
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal de dispositivos */}
      {deviceModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div
            ref={modalRef}
            className={
              isDark
                ? "w-full max-w-sm bg-neutral-900 rounded-2xl shadow-lg p-0 overflow-hidden animate-fadeIn"
                : "w-full max-w-sm bg-white rounded-2xl shadow-lg p-0 overflow-hidden animate-fadeIn"
            }
          >
            <div
              className={
                isDark
                  ? "flex items-center justify-between px-5 pt-5 pb-2 border-b border-neutral-800"
                  : "flex items-center justify-between px-5 pt-5 pb-2 border-b border-neutral-200"
              }
            >
              <span className={isDark ? "font-bold text-lg text-white" : "font-bold text-lg text-neutral-900"}>
                Dispositivos
              </span>
              <button
                onClick={handleCloseDevicesModal}
                className={
                  isDark
                    ? "text-neutral-400 hover:text-white text-2xl font-bold"
                    : "text-neutral-400 hover:text-neutral-900 text-2xl font-bold"
                }
              >
                &times;
              </button>
            </div>
            <div className="px-5 py-4">
              <div className={isDark ? "text-xs text-neutral-400 mb-2" : "text-xs text-neutral-500 mb-2"}>
                {selectedUser.devices.length}/2 dispositivos
              </div>
              {selectedUser.devices.length === 0 && (
                <div
                  className={
                    isDark
                      ? "text-center py-8 text-base font-medium text-neutral-500"
                      : "text-center py-8 text-base font-medium text-neutral-400"
                  }
                >
                  Nenhum dispositivo conectado.
                </div>
              )}
              {selectedUser.devices.map((device: any) => (
                <div
                  key={device.type}
                  className={
                    isDark
                      ? "flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-3 mb-3 shadow-sm"
                      : "flex items-center justify-between bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-3 mb-3 shadow-sm"
                  }
                >
                  <div className="flex items-center gap-3">
                    {device.type === "PC" ? (
                      <svg
                        className={isDark ? "w-7 h-7 text-blue-400" : "w-7 h-7 text-blue-500"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M8 20h8M12 16v4" />
                      </svg>
                    ) : (
                      <svg
                        className={isDark ? "w-7 h-7 text-neutral-400" : "w-7 h-7 text-neutral-500"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="7" y="2" width="10" height="20" rx="2" />
                        <path d="M11 18h2" />
                      </svg>
                    )}
                    <div className="flex flex-col">
                      <span
                        className={
                          isDark ? "font-semibold text-sm text-white" : "font-semibold text-sm text-neutral-900"
                        }
                      >
                        {device.type === "PC" ? "Computador" : "Mobile"}
                      </span>
                      <span className={isDark ? "text-xs text-neutral-400" : "text-xs text-neutral-500"}>
                        {device.browser} • {device.lastActive}
                      </span>
                    </div>
                  </div>
                  <button
                    className={
                      isDark
                        ? "ml-2 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                        : "ml-2 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
                    }
                    onClick={() => handleRemoveDevice(selectedUser.userName, device.type)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <button
              className={
                isDark
                  ? "w-full py-3 text-center text-green-500 font-bold border-t border-neutral-800 bg-neutral-900 rounded-b-2xl hover:bg-neutral-800 transition"
                  : "w-full py-3 text-center text-green-600 font-bold border-t border-neutral-200 bg-white rounded-b-2xl hover:bg-neutral-100 transition"
              }
              onClick={handleCloseDevicesModal}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Exibindo a mensagem de sucesso ou erro */}
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity={severity}
          sx={{
            width: "100%",
            color: "black",
            fontSize: "1rem",
            fontWeight: "bold",
            backgroundColor: severity === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ContactsMobile;
