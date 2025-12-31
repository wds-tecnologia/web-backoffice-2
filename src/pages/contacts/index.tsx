import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { mockDataContacts, mockDataTeam } from "../../data/mockData";
import Header from "../../components/Header";
import { Alert, Box, Button, Snackbar, Typography, useTheme, Chip } from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import DeleteIcon from "@mui/icons-material/Delete";
import DevicesIcon from "@mui/icons-material/Devices";
import RefreshIcon from "@mui/icons-material/Refresh";
import useMediaQuery from "@mui/material/useMediaQuery";
import ContactsMobile from "./ContactsMobile";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ComputerIcon from "@mui/icons-material/Computer";
import SmartphoneIcon from "@mui/icons-material/Smartphone";

interface RowData {
  userName: string;
  id: number;
  name: string;
  age: number;
  accessLevel: "admin" | "manager" | "user";
  connectedDevices: number; // Nova propriedade para dispositivos conectados
  devices: { type: string; browser: string; lastActive: string }[]; // Nova propriedade para dispositivos
}

const Contacts: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Estado para armazenar os dados da API
  const [rows, setRows] = useState<RowData[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"error" | "success" | "info" | "warning">("info"); // Define um valor padrão
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RowData | null>(null);
  const [search, setSearch] = useState("");

  const columns = [
    { field: "id", headerName: "Nº", flex: 0.4, headerAlign: "center" as const, align: "center" as const },
    {
      field: "userName",
      headerName: "Nome de Usuário",
      flex: 1,
      headerAlign: "center" as const,
      align: "center" as const,
    },
    { field: "name", headerName: "Nome", flex: 1, headerAlign: "center" as const, align: "center" as const },
    {
      field: "status",
      headerName: "Status",
      flex: 0.6,
      headerAlign: "center" as const,
      align: "center" as const,
    },
    {
      field: "created_at",
      headerName: "Data de Criação",
      flex: 0.7,
      valueFormatter: (params: any) => {
        return new Date(params.value).toLocaleDateString(); // Formata a data
      },
      headerAlign: "center" as const,
      align: "center" as const,
    },
    {
      field: "blocked",
      headerName: "Bloqueado",
      flex: 0.6,
      renderCell: (params: any) => (params.value ? "Sim" : "Não"),
      headerAlign: "center" as const,
      align: "center" as const,
    },
    { field: "counter", headerName: "Contador", flex: 0.6, headerAlign: "center" as const, align: "center" as const },
    { field: "role", headerName: "Tipo", flex: 0.7, headerAlign: "center" as const, align: "center" as const },
    {
      field: "connectedDevices",
      headerName: "Conectados",
      flex: 0.7,
      renderCell: (params: any) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <DevicesIcon sx={{ fontSize: 15, color: colors.grey[300] }} />
          <Chip
            label={`${params.value}/2`}
            size="small"
            color={params.value === 0 ? "default" : params.value === 1 ? "warning" : "success"}
            sx={{
              fontSize: "0.7rem",
              fontWeight: "bold",
              minWidth: "32px",
              height: "22px",
              px: 0.5,
            }}
          />
        </Box>
      ),
      headerAlign: "center" as const,
      align: "center" as const,
    },
    {
      field: "action",
      headerName: "Ações",
      flex: 1.1,
      headerAlign: "center" as const,
      align: "center" as const,
      renderCell: (params: any) => (
        <Box display="inline-flex" gap={0.5} alignItems="center" flexDirection={{ xs: "column", sm: "row" }} p={0}>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            // Remover o startIcon para evitar ícone duplicado
            onClick={() => handleResetDevices(params.row.userName)}
            sx={{
              fontSize: { xs: "0.65rem", sm: "0.7rem" },
              minWidth: "60px",
              px: 0.5,
              height: "36px",
              lineHeight: 1,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              textTransform: "none",
              gap: 0.5,
            }}
          >
            <RefreshIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Box display="flex" flexDirection="column" alignItems="flex-start" justifyContent="center">
              <span style={{ lineHeight: 1, fontWeight: 500 }}>Limpar</span>
              <span style={{ lineHeight: 1, fontWeight: 500 }}>Dispositivos</span>
            </Box>
          </Button>
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.userName)}
            sx={{
              minWidth: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0,
              ml: 0.5,
            }}
          >
            <DeleteIcon sx={{ fontSize: 22, color: theme.palette.error.main }} />
          </Button>
        </Box>
      ),
    },
  ];

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
        return {
          ...row,
          devices: row.devices.filter((d: any) => d.type !== deviceType),
          connectedDevices: row.devices.filter((d: any) => d.type !== deviceType).length,
        };
      })
    );
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        devices: selectedUser.devices.filter((d: any) => d.type !== deviceType),
        connectedDevices: selectedUser.devices.filter((d: any) => d.type !== deviceType).length,
      });
    }
  };

  // Função para resetar dispositivos (mockada)
  const handleResetDevices = async (userName: string) => {
      try {
        // Obtendo o JWT token de localStorage
        const token = localStorage.getItem("@backoffice:token");

        if (!token) {
          console.error("Token não encontrado!");
          return;
        }

        console.log("Token encontrado:", token);

        // Adicionando o token ao header da requisição
        const response = await api.delete(`/userDevices/userGraphicDevice/${userName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Atualiza a lista de usuários ou remove o usuário da interface
        setRows((prevRows) =>
          prevRows.map((row) => {
            if (row.userName !== userName) return row;
            return { ...row, devices: [], connectedDevices: 0 };
          })
        );

        setMessage(`Dispositivos do usuário ${userName} resetados com sucesso.`);
        setSeverity("success");
      }
      catch (error) {
        setMessage(`Erro ao resetar dispositivos do usuário ${userName}.`);
        setSeverity("error");
      }
  };

  // Função que será chamada ao clicar no botão de delete
  const   handleDelete = async (userName: string) => {
    try {
      // Obtendo o JWT token de localStorage
      const token = localStorage.getItem("@backoffice:token");

      if (!token) {
        console.error("Token não encontrado!");
        return;
      }

      console.log("Token encontrado:", token);

      // Adicionando o token ao header da requisição
      const response = await api.delete("/graphic/delete", {
        data: { userName }, // Passando apenas o userName para o backend
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Usuário excluído com sucesso:", response.data);

      // Atualiza a lista de usuários ou remove o usuário da interface
      setRows((prevRows) => prevRows.filter((row) => row.userName !== userName));

      // Realizar a exclusão
      setMessage(`Usuário ${userName} excluído com sucesso.`);
      setSeverity("success");
      setOpen(true);
    } catch (error) {
      setMessage(`Erro ao excluir o usuário ${userName}.`);
      setSeverity("error");
      setOpen(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtendo o JWT token de localStorage
        const token = localStorage.getItem("@backoffice:token");

        if (!token) {
          console.error("Token não encontrado!");
          return;
        }

        console.log("Token encontrado:", token);

        // Adicionando o token ao header da requisição
        const response = await api.get("/graphic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Dados recebidos:", response.data);

        // Garantir que os dados recebidos tenham a estrutura esperada
        const formattedRows = response.data.map((item: any, index: number) => {
          // Gera devices coerentes com connectedDevices
          const connectedDevices = item.devices.length;
          let devices: { type: string; browser: string; lastActive: string }[] = [];

          return {
            id: index + 1,
            name: item.name,
            userName: item.userName,
            status: item.status,
            created_at: item.created_at,
            blocked: item.blocked,
            counter: item.counter,
            role: item.role === "MANAGER" ? "LÍDER DE GRUPOS" : "USUÁRIO",
            connectedDevices: item.devices.length,
            devices: item.devices || [],
          };
        });
        setRows(formattedRows);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };

    fetchData();
  }, []);

  if (isMobile) {
    return <ContactsMobile />;
  }

  // Filtragem dos usuários pelo campo de busca
  const filteredRows = rows.filter((row) => row.userName.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box m="20px">
      <Header title="Usuários" subtitle="Gerenciamento total de usuários" />
      <Box mb={2} sx={{ position: "relative", width: "100%", maxWidth: 320 }}>
        <input
          type="text"
          placeholder="Buscar por nome de usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 36px 10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: theme.palette.mode === "dark" ? "#23272f" : "#f5f6fa",
            color: theme.palette.text.primary,
            fontSize: 15,
            outline: "none",
            marginBottom: 8,
          }}
        />
        <span style={{ position: "absolute", right: 12, top: 10, color: "#aaa", pointerEvents: "none" }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-2-2" />
          </svg>
        </span>
      </Box>
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
          "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
            color: `${colors.grey[100]} !important`,
          },
        }}
      >
        <DataGrid rows={filteredRows} columns={columns} components={{ Toolbar: GridToolbar }} />
      </Box>
      <Dialog open={deviceModalOpen} onClose={handleCloseDevicesModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.2rem", pb: 0 }}>
          Dispositivos
          <IconButton
            aria-label="close"
            onClick={handleCloseDevicesModal}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <div className="flex flex-col gap-2 mb-2">
                <div
                  className="text-xs text-neutral-500 mb-1"
                  style={{ color: theme.palette.mode === "dark" ? "#aaa" : "#666" }}
                >
                  {selectedUser.devices.length}/2 dispositivos
                </div>
                {selectedUser.devices.length === 0 && (
                  <div
                    className="text-center py-6 text-base font-medium"
                    style={{ color: theme.palette.mode === "dark" ? "#aaa" : "#666" }}
                  >
                    Nenhum dispositivo conectado.
                  </div>
                )}
                {selectedUser.devices.map((device: any) => (
                  <div
                    key={device.type}
                    style={{
                      background: theme.palette.mode === "dark" ? "#23272f" : "#f5f6fa",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      boxShadow: theme.palette.mode === "dark" ? "0 1px 4px #0002" : "0 1px 4px #0001",
                      border: `1px solid ${theme.palette.mode === "dark" ? "#333" : "#e0e0e0"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {device.type === "PC" ? (
                        <ComputerIcon color="primary" sx={{ fontSize: 28 }} />
                      ) : (
                        <SmartphoneIcon color="action" sx={{ fontSize: 28 }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: theme.palette.text.primary }}>
                          {device.type === "PC" ? "Computador" : "Mobile"}
                        </span>
                        <span style={{ fontSize: 13, color: theme.palette.text.secondary }}>
                          {device.browser} • {device.lastActive}
                        </span>
                      </div>
                    </div>
                    <Button
                      color="error"
                      size="small"
                      variant="contained"
                      sx={{
                        fontWeight: 600,
                        fontSize: 13,
                        borderRadius: 2,
                        boxShadow: "none",
                        px: 2,
                        py: 0.5,
                        minWidth: 0,
                        textTransform: "none",
                        background: theme.palette.mode === "dark" ? "#e53935" : "#d32f2f",
                        "&:hover": { background: theme.palette.mode === "dark" ? "#c62828" : "#b71c1c" },
                      }}
                      onClick={() => handleRemoveDevice(selectedUser.userName, device.type)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDevicesModal} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Exibindo a mensagem de sucesso ou erro */}
      {message && (
        <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
          <Alert
            onClose={handleClose}
            severity={severity}
            sx={{
              width: "100%",
              color: "black",
              fontSize: "1rem",
              fontWeight: "bold",
              backgroundColor: `${severity === "success" ? colors.greenAccent[700] : colors.redAccent[700]}`,
            }}
          >
            {message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default Contacts;
