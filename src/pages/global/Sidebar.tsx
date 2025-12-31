import type React from "react";

import { useEffect, useState } from "react";
import { ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Box, Button, IconButton, Typography, useTheme, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom"; // Removido o import do Link
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { EnhancedModal } from "../../components/modals/harCodedModal";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BackupIcon from "@mui/icons-material/Backup";
import ListIcon from "@mui/icons-material/List";
import DownloadIcon from "@mui/icons-material/Download";
import RestoreIcon from "@mui/icons-material/Restore";
import { usePermissionStore } from "../../store/permissionsStore";
import { api } from "../../services/api";

interface SidebarProps {
  isSidebar?: boolean;
}

interface ItemProps {
  title: string;
  to: string;
  icon: React.ReactNode;
  selected: string;
  setSelected: (value: string) => void;
  requiresValidation?: boolean; // Nova prop para indicar se o item requer validação
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebar }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotDatabaseId, setSnapshotDatabaseId] = useState("");
  const [snapshotEmail, setSnapshotEmail] = useState("");
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotSuccessToast, setSnapshotSuccessToast] = useState(false);
  const [snapshotErrorToast, setSnapshotErrorToast] = useState(false);
  const [snapshotErrorMessage, setSnapshotErrorMessage] = useState("");
  const [showSnapshotsList, setShowSnapshotsList] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState<string | null>(null);
  const { getPermissions, permissions, user } = usePermissionStore();
  const location = useLocation();

  useEffect(() => {
    getPermissions();
    console.log("Permissões carregadas:", permissions);
  }, [location.pathname]);

  const { onLogout } = useAuthBackoffice();

  // Monitor selected state to open modal when "Gerenciar Planilhas" is selected
  const [selected, setSelected] = useState("Dashboard");

  // Componente Item modificado para estar dentro do Sidebar e ter acesso ao estado
  const Item: React.FC<ItemProps> = ({ title, to, icon, selected, setSelected, requiresValidation = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const handleClick = () => {
      setSelected(title);

      if (requiresValidation) {
        // Se requer validação, armazena a rota pendente e abre o modal
        setPendingNavigation(to);
        setOpenModal(true);
      } else {
        // Se não requer validação, navega diretamente
        navigate(to);
      }
    };

    return (
      <MenuItem
        active={selected === title}
        style={{
          color: colors.grey[100],
        }}
        onClick={handleClick}
        icon={icon}
      >
        <Typography>{title}</Typography>
      </MenuItem>
    );
  };

  const handleSaveSpreadsheetModal = (value: string, canNavigate: boolean) => {
    // Store the input value regardless of navigation
    setSpreadsheetInput(value);

    // Only navigate if explicitly allowed by the API response
    if (canNavigate && pendingNavigation) {
      navigate(pendingNavigation);
      setOpenModal(false);
      setPendingNavigation(null);
    } else {
      // Show toast error if we can't navigate
      setShowErrorToast(true);
      // Keep the modal open to allow the user to try again
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setPendingNavigation(null);
    // Reset selection to Dashboard when modal is closed without saving
    if (selected === "Gerenciar Planilhas") {
      setSelected("Dashboard");
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Aguardar 3 segundos antes de chamar o onLogout
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Executar o logout após o delay
      onLogout();

      console.log("Logout realizado com sucesso.");

      // Redireciona após o logout
      navigate("/");
    } catch (error) {
      console.error("Erro durante o logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleListSnapshots = async () => {
    setSnapshotsLoading(true);
    try {
      const token = localStorage.getItem("@backoffice:token");
      
      if (!token) {
        setSnapshotErrorMessage("Token de autenticação não encontrado. Por favor, faça login novamente.");
        setSnapshotErrorToast(true);
        setSnapshotsLoading(false);
        return;
      }
      
      console.log("🔑 Token encontrado para listar:", token ? `${token.substring(0, 20)}...` : "não encontrado");
      
      const params: { databaseId?: string } = {};
      
      // Só adiciona databaseId se foi preenchido
      if (snapshotDatabaseId.trim()) {
        params.databaseId = snapshotDatabaseId.trim();
      }
      
      const response = await api.get(
        "/backoffice/database/list-snapshots",
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const snapshots = response.data.snapshots || [];
        console.log("📋 Snapshots recebidos:", snapshots.length);
        console.log("📋 Primeiro snapshot (exemplo):", snapshots[0]);
        setSnapshotsList(snapshots);
        setShowSnapshotsList(true);
      }
    } catch (error: any) {
      console.error("Erro ao listar snapshots:", error);
      let errorMessage = "Erro ao listar snapshots";
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 403) {
          errorMessage = data?.message || "Acesso bloqueado pela Square Cloud";
        } else if (data?.error) {
          errorMessage = data.error;
        }
      }
      
      setSnapshotErrorMessage(errorMessage);
      setSnapshotErrorToast(true);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot: any) => {
    // Confirmar restauração (operação perigosa)
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a restaurar o banco de dados para o snapshot de ${snapshot.modifiedFormatted}.\n\n` +
      `Esta operação irá SOBRESCREVER todos os dados atuais do banco de dados.\n\n` +
      `Tem certeza que deseja continuar?`
    );

    if (!confirmed) {
      return;
    }

    setRestoringSnapshot(snapshot.name);
    try {
      const token = localStorage.getItem("@backoffice:token");
      
      if (!token) {
        setSnapshotErrorMessage("Token de autenticação não encontrado. Por favor, faça login novamente.");
        setSnapshotErrorToast(true);
        setRestoringSnapshot(null);
        return;
      }

      const requestBody: { databaseId?: string; snapshotId: string; versionId: string } = {
        snapshotId: snapshot.name,
        versionId: snapshot.versionId || "",
      };
      
      // Só adiciona databaseId se foi preenchido
      if (snapshotDatabaseId.trim()) {
        requestBody.databaseId = snapshotDatabaseId.trim();
      }

      if (!snapshot.versionId) {
        setSnapshotErrorMessage("Erro: versionId não encontrado no snapshot. Não é possível restaurar.");
        setSnapshotErrorToast(true);
        setRestoringSnapshot(null);
        return;
      }
      
      const response = await api.post(
        "/backoffice/database/restore-snapshot",
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSnapshotSuccessToast(true);
        // Recarregar lista de snapshots após restauração
        setTimeout(() => {
          handleListSnapshots();
        }, 1000);
      }
    } catch (error: any) {
      console.error("Erro ao restaurar snapshot:", error);
      let errorMessage = "Erro ao restaurar snapshot";
      let errorDetails = "";
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 403) {
          if (data?.wafBlocked) {
            errorMessage = "Acesso bloqueado pelo sistema de segurança da Square Cloud (WAF)";
            errorDetails = data?.details || "A requisição foi bloqueada pelo Web Application Firewall da Square Cloud.";
          } else {
            errorMessage = data?.error || "Acesso negado pela Square Cloud";
            errorDetails = data?.message || "";
          }
          
          if (data?.suggestions && Array.isArray(data.suggestions)) {
            errorDetails += "\n\nSugestões:\n" + data.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
          } else if (data?.suggestion) {
            errorDetails += `\n\nSugestão: ${data.suggestion}`;
          }
        } else if (status === 401) {
          errorMessage = "Não autorizado";
          errorDetails = "Token de autenticação inválido ou expirado. Por favor, faça login novamente.";
        } else if (data?.error) {
          errorMessage = data.error;
          errorDetails = data?.details || data?.message || "";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnapshotErrorMessage(errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage);
      setSnapshotErrorToast(true);
    } finally {
      setRestoringSnapshot(null);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!snapshotEmail.trim()) {
      setSnapshotErrorMessage("Preencha o email");
      setSnapshotErrorToast(true);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(snapshotEmail)) {
      setSnapshotErrorMessage("Email inválido");
      setSnapshotErrorToast(true);
      return;
    }

    setSnapshotLoading(true);
    try {
      const token = localStorage.getItem("@backoffice:token");
      
      if (!token) {
        setSnapshotErrorMessage("Token de autenticação não encontrado. Por favor, faça login novamente.");
        setSnapshotErrorToast(true);
        setSnapshotLoading(false);
        return;
      }
      
      console.log("🔑 Token encontrado:", token ? `${token.substring(0, 20)}...` : "não encontrado");
      
      const requestBody: { email: string; databaseId?: string } = {
        email: snapshotEmail.trim(),
      };
      
      // Guardar o databaseId usado antes de limpar
      const usedDatabaseId = snapshotDatabaseId.trim();
      
      // Só adiciona databaseId se foi preenchido
      if (usedDatabaseId) {
        requestBody.databaseId = usedDatabaseId;
      }
      
      const response = await api.post(
        "/backoffice/database/create-snapshot-and-send-email",
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSnapshotSuccessToast(true);
        setShowSnapshotModal(false);
        setSnapshotDatabaseId("");
        setSnapshotEmail("");
        
        // Se a lista de snapshots estiver visível, recarregar automaticamente
        if (showSnapshotsList) {
          // Aguardar um pouco para o snapshot ser processado
          setTimeout(async () => {
            try {
              const refreshToken = localStorage.getItem("@backoffice:token");
              const params: { databaseId?: string } = {};
              
              // Usar o mesmo databaseId que foi usado para criar
              if (usedDatabaseId) {
                params.databaseId = usedDatabaseId;
              }
              
              const listResponse = await api.get(
                "/backoffice/database/list-snapshots",
                {
                  params,
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (listResponse.data.success) {
                setSnapshotsList(listResponse.data.snapshots || []);
              }
            } catch (error) {
              console.error("Erro ao recarregar lista de snapshots:", error);
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error("Erro ao criar snapshot:", error);
      
      let errorMessage = "Erro ao criar snapshot";
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 403) {
          if (data?.wafBlocked) {
            errorMessage = "Acesso bloqueado pelo sistema de segurança da Square Cloud (WAF)";
            if (data?.details) {
              errorMessage += `\n\n${data.details}`;
            }
            if (data?.suggestions && Array.isArray(data.suggestions)) {
              errorMessage += "\n\nSugestões:\n" + data.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
            } else if (data?.suggestion) {
              errorMessage += `\n\nSugestão: ${data.suggestion}`;
            }
          } else if (data?.message) {
            errorMessage = `${data.error || "Acesso bloqueado"}: ${data.message}`;
            if (data.suggestion) {
              errorMessage += `\n\nSugestão: ${data.suggestion}`;
            }
          } else if (data?.error) {
            errorMessage = data.error;
            if (data.details) {
              errorMessage += `\n\nDetalhes: ${Array.isArray(data.details) ? data.details.join("\n") : data.details}`;
            }
          } else {
            errorMessage = "Acesso negado pela Square Cloud. Isso pode ser devido a:\n1. Limite de requisições excedido\n2. IP bloqueado temporariamente\n3. Chave API inválida\n\nAguarde alguns minutos e tente novamente.";
          }
        } else if (status === 401) {
          errorMessage = "Não autorizado. Faça login novamente.";
        } else if (status === 400) {
          errorMessage = data?.error || data?.message || "Dados inválidos. Verifique os campos preenchidos.";
        } else if (data?.error) {
          errorMessage = data.error;
          if (data.details) {
            errorMessage += `\n\nDetalhes: ${typeof data.details === "string" ? data.details : JSON.stringify(data.details)}`;
          }
        } else {
          errorMessage = `Erro ${status}: ${data?.message || "Erro desconhecido"}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnapshotErrorMessage(errorMessage);
      setSnapshotErrorToast(true);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const canShowTab = (key: string): boolean => {
    if (user?.role === "MASTER") return true;

    const perms = permissions;

    switch (key) {
      case "CRIAR_USUARIO":
      case "GERENCIAR_GRUPOS":
      case "GERENCIAR_USUARIOS":
      case "GERENCIAR_OPERADORES":
      case "GERENCIAR_PLANILHAS":
      case "GERENCIAR_INVOICES":
      case "GERENCIAR_TOKENS":
      case "GERENCIAR_BOLETOS":
        return perms?.[key]?.enabled === true;
      default:
        return false;
    }
  };

  return (
    <Box
      sx={{
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 25px 5px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: "#868dfb !important",
        },
        "& .pro-menu-item.active": {
          color: "#6870fa !important",
        },
      }}
      style={{ zIndex: 40 }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO AND MENU ICON */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 20px 0",
              color: colors.grey[100],
            }}
          >
            {!isCollapsed && (
              <Box display="flex" justifyContent="center" alignItems="center" ml="3.4375rem" gap="0.5rem">
                <Typography variant="h3" color={colors.grey[300]}>
                  Pet Store
                </Typography>
                <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>

          {!isCollapsed && (
            <Box mb="25px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img
                  alt="profile-user"
                  width="100px"
                  height="100px"
                  src={`../../assets/user.png`}
                  style={{ cursor: "pointer", borderRadius: "50%" }}
                />
              </Box>
              <Box textAlign="center">
                {user && user.role !== "MASTER" ? (
                  <>
                    <Typography variant="h2" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 0 0" }}>
                      {/* Exibe primeiro e último nome do usuário */}
                      {user.name ? `${user.name.split(" ")[0]} ${user.name.split(" ").slice(-1)[0]}` : "Usuário"}
                    </Typography>
                    <Typography variant="h5" color={colors.greenAccent[500]}>
                      {user.role === "OPERATOR" ? "OPERADOR" : "VP Administrador"}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="h2" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 0 0" }}>
                      Ed Rocha
                    </Typography>
                    <Typography variant="h5" color={colors.greenAccent[500]}>
                      VP Administrador
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          )}

          <Box paddingLeft={isCollapsed ? undefined : "10%"}>
            {
              <Item
                title="Menu Principal"
                to="/"
                icon={<HomeOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
              />
            }

            {user?.role === "OPERATOR" && (
              <Item
                title="Meu Perfil"
                to="/meu-perfil-operator"
                icon={<PersonOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {user?.role === "MASTER" && (
              <Item
                title="Meu Perfil"
                to="/meu-perfil-master"
                icon={<PersonOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {canShowTab("CRIAR_USUARIO") && (
              <>
                {!isCollapsed && (
                  <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                    Novo Cadastro:
                  </Typography>
                )}
                <Item
                  title="Criar Usuário"
                  to="/create-form-user"
                  icon={<PersonAddIcon />}
                  selected={selected}
                  setSelected={setSelected}
                />
              </>
            )}
            {canShowTab("GERENCIAR_GRUPOS") && (
              <>
                {!isCollapsed && (
                  <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                    Usuário/Grupo
                  </Typography>
                )}
                <Item
                  title="Gerenciar Grupos"
                  to="/team"
                  icon={<PeopleOutlinedIcon />}
                  selected={selected}
                  setSelected={setSelected}
                />
              </>
            )}
            {canShowTab("GERENCIAR_USUARIOS") && (
              <Item
                title="Gerenciar Usuários"
                to="/users"
                icon={<PersonOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {canShowTab("GERENCIAR_OPERADORES") && (
              <Item
                title="Gerenciar Operadores"
                to="/operators-management"
                icon={<AdminPanelSettingsOutlinedIcon />} // OU PersonOutlinedIcon se preferir
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {/* Este item agora requer validação */}
            {canShowTab("GERENCIAR_PLANILHAS") && (
              <>
                {!isCollapsed && (
                  <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                    Planilhas:
                  </Typography>
                )}
                <Item
                  title="Gerenciar Planilhas"
                  to="/spreadsheets"
                  icon={<TableChartOutlinedIcon />}
                  selected={selected}
                  setSelected={setSelected}
                  requiresValidation={true}
                />
              </>
            )}
            {canShowTab("GERENCIAR_INVOICES") && (
              <Item
                title="Gerenciar Invoices"
                to="/invoices-management"
                icon={<DescriptionOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
                requiresValidation={true}
              />
            )}
            {canShowTab("GERENCIAR_TOKENS") && (
              <Item
                title="Gerenciar Tokens"
                to="/tokens-management"
                icon={<DescriptionOutlinedIcon />}
                selected={selected}
                setSelected={setSelected}
                requiresValidation={true}
              />
            )}
            {/* Este item agora requer validação */}
            {canShowTab("GERENCIAR_BOLETOS") && (
              <>
                {!isCollapsed && (
                  <Typography variant="h6" color={colors.greenAccent[300]} sx={{ m: "15px 0 5px 20px" }}>
                    Boletos:
                  </Typography>
                )}
                <Item
                  title="Gerenciar Boletos"
                  to="/billets-management"
                  icon={<TableChartOutlinedIcon />}
                  selected={selected}
                  setSelected={setSelected}
                  requiresValidation={true}
                />
              </>
            )}
            
            {/* Botões de Snapshot - Apenas para MASTER */}
            {user?.role === "MASTER" && !isCollapsed && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  mt: "20px",
                  mb: "10px",
                  ml: "-20px",
                  width: "100%",
                  px: "5%",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<BackupIcon />}
                    onClick={() => setShowSnapshotModal(true)}
                    sx={{
                      width: "100%",
                      borderColor: colors.blueAccent[500],
                      color: colors.blueAccent[500],
                      "&:hover": {
                        borderColor: colors.blueAccent[600],
                        backgroundColor: colors.blueAccent[900],
                      },
                    }}
                  >
                    Backup BD BR
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ListIcon />}
                    onClick={handleListSnapshots}
                    disabled={snapshotsLoading}
                    sx={{
                      width: "100%",
                      borderColor: colors.greenAccent[500],
                      color: colors.greenAccent[500],
                      "&:hover": {
                        borderColor: colors.greenAccent[600],
                        backgroundColor: colors.greenAccent[900],
                      },
                    }}
                  >
                    {snapshotsLoading ? "Carregando..." : "Listar"}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Enhanced Modal Component */}
            <EnhancedModal
              open={openModal}
              onClose={handleCloseModal}
              onSave={handleSaveSpreadsheetModal}
              title="Digite a senha de acesso"
              label="Code"
            />
            
            {/* Modal de Lista de Snapshots */}
            <Dialog
              open={showSnapshotsList}
              onClose={() => setShowSnapshotsList(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  backgroundColor: colors.primary[400],
                  borderRadius: "12px",
                  border: `1px solid ${colors.grey[700]}`,
                },
              }}
            >
              <DialogTitle
                sx={{
                  backgroundColor: colors.primary[500],
                  color: colors.grey[100],
                  fontWeight: "bold",
                  fontSize: "1.25rem",
                  borderBottom: `1px solid ${colors.grey[700]}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ListIcon sx={{ color: colors.greenAccent[500] }} />
                Snapshots do Banco de Dados
                <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ color: colors.grey[400] }}>
                    {snapshotsList.length} {snapshotsList.length === 1 ? "snapshot" : "snapshots"}
                  </Typography>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                {snapshotsLoading ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body1" sx={{ color: colors.grey[300] }}>
                      Carregando snapshots...
                    </Typography>
                  </Box>
                ) : snapshotsList.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body1" sx={{ color: colors.grey[400] }}>
                      Nenhum snapshot encontrado
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      p: 2,
                    }}
                  >
                    {snapshotsList.map((snapshot: any, index: number) => (
                      <Box
                        key={index}
                        sx={{
                          mb: 2,
                          p: 2,
                          backgroundColor: colors.primary[600],
                          borderRadius: "8px",
                          border: `1px solid ${colors.grey[700]}`,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: colors.blueAccent[500],
                            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2)`,
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: colors.grey[200], fontWeight: "bold", mb: 0.5 }}>
                              📅 {snapshot.modifiedFormatted}
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.grey[400] }}>
                              Tamanho: {snapshot.sizeInMB} MB
                            </Typography>
                            {snapshot.name && (
                              <Typography variant="caption" sx={{ color: colors.grey[500], fontFamily: "monospace", display: "block", mt: 0.5 }}>
                                ID: {snapshot.name.substring(0, 20)}...
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                          <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => window.open(snapshot.downloadUrl, "_blank")}
                            sx={{
                              backgroundColor: colors.blueAccent[500],
                              color: colors.grey[100],
                              "&:hover": {
                                backgroundColor: colors.blueAccent[600],
                              },
                              flex: 1,
                            }}
                          >
                            Baixar
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<RestoreIcon />}
                            onClick={() => {
                              if (!snapshot.versionId) {
                                console.warn("⚠️ versionId não encontrado no snapshot:", snapshot);
                                setSnapshotErrorMessage("Erro: versionId não encontrado neste snapshot. Não é possível restaurar.");
                                setSnapshotErrorToast(true);
                                return;
                              }
                              handleRestoreSnapshot(snapshot);
                            }}
                            disabled={restoringSnapshot === snapshot.name || !snapshot.versionId}
                            title={!snapshot.versionId ? "versionId não encontrado - não é possível restaurar" : "Restaurar banco de dados para este snapshot"}
                            sx={{
                              backgroundColor: "#ff9800",
                              color: colors.grey[100],
                              "&:hover": {
                                backgroundColor: "#f57c00",
                              },
                              "&:disabled": {
                                opacity: 0.5,
                                cursor: "not-allowed",
                              },
                              flex: 1,
                            }}
                          >
                            {restoringSnapshot === snapshot.name ? "Restaurando..." : "Restaurar"}
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </DialogContent>
              <DialogActions
                sx={{
                  backgroundColor: colors.primary[500],
                  borderTop: `1px solid ${colors.grey[700]}`,
                  p: 2,
                }}
              >
                <Button
                  onClick={() => setShowSnapshotsList(false)}
                  sx={{
                    color: colors.grey[300],
                    "&:hover": {
                      backgroundColor: colors.primary[600],
                    },
                  }}
                >
                  Fechar
                </Button>
              </DialogActions>
            </Dialog>
            
            {/* Modal de Snapshot */}
            {showSnapshotModal && (
              <Box
                sx={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                }}
              >
                <Box
                  sx={{
                    backgroundColor: colors.primary[400],
                    padding: "24px",
                    borderRadius: "8px",
                    minWidth: "400px",
                    maxWidth: "500px",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2, color: colors.grey[100] }}>
                    📦 Criar Snapshot do Banco de Dados
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: colors.grey[200] }}>
                      ID do Banco de Dados (opcional - será extraído automaticamente se não preenchido):
                    </Typography>
                    <input
                      type="text"
                      value={snapshotDatabaseId}
                      onChange={(e) => setSnapshotDatabaseId(e.target.value)}
                      placeholder="Deixe em branco para usar o banco configurado"
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: `1px solid ${colors.grey[700]}`,
                        backgroundColor: colors.primary[500],
                        color: colors.grey[100],
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 0.5, color: colors.grey[400], display: "block" }}>
                      Se deixado em branco, o sistema extrairá automaticamente da configuração do banco de dados.
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: colors.grey[200] }}>
                      Email para receber o snapshot:
                    </Typography>
                    <input
                      type="email"
                      value={snapshotEmail}
                      onChange={(e) => setSnapshotEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: `1px solid ${colors.grey[700]}`,
                        backgroundColor: colors.primary[500],
                        color: colors.grey[100],
                      }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowSnapshotModal(false);
                        setSnapshotDatabaseId("");
                        setSnapshotEmail("");
                      }}
                      sx={{
                        color: colors.grey[200],
                        borderColor: colors.grey[700],
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleCreateSnapshot}
                      disabled={snapshotLoading}
                      sx={{
                        backgroundColor: colors.blueAccent[500],
                        "&:hover": {
                          backgroundColor: colors.blueAccent[600],
                        },
                      }}
                    >
                      {snapshotLoading ? "Criando..." : "Criar Snapshot"}
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Error Toast */}
            <Snackbar
              open={showErrorToast}
              autoHideDuration={6000}
              onClose={() => setShowErrorToast(false)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert onClose={() => setShowErrorToast(false)} severity="error" sx={{ width: "100%" }}>
                Não foi possível acessar a planilha. Verifique o valor inserido.
              </Alert>
            </Snackbar>

            {/* Success Toast para Snapshot */}
            <Snackbar
              open={snapshotSuccessToast}
              autoHideDuration={6000}
              onClose={() => setSnapshotSuccessToast(false)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert onClose={() => setSnapshotSuccessToast(false)} severity="success" sx={{ width: "100%" }}>
                Snapshot criado e enviado por email com sucesso!
              </Alert>
            </Snackbar>

            {/* Error Toast para Snapshot */}
            <Snackbar
              open={snapshotErrorToast}
              autoHideDuration={6000}
              onClose={() => setSnapshotErrorToast(false)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert onClose={() => setSnapshotErrorToast(false)} severity="error" sx={{ width: "100%" }}>
                {snapshotErrorMessage || "Erro ao criar snapshot"}
              </Alert>
            </Snackbar>
            {/* Barra Superior com Botão de Sair */}
            {!isCollapsed && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: "160px",
                  mb: "20px",
                  ml: "-20px",
                  width: "100%",
                }}
              >
                <Button
                  type="submit"
                  color="success"
                  variant="contained"
                  disabled={loading}
                  onClick={handleLogout}
                  className="flex items-center text-red-600 hover:text-red-800 focus:outline-none"
                >
                  {/* Ícone de Seta ou Porta */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12H3m12 0l-4-4m4 4l-4 4m11-6v7a2 2 0 01-2 2H7m14-9h-7"
                    />
                  </svg>
                  Sair
                </Button>
              </Box>
            )}
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
