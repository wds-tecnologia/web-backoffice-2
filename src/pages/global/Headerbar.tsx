import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  useTheme,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { EnhancedModal } from "../../components/modals/harCodedModal";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { usePermissionStore } from "../../store/permissionsStore";

interface HeaderMenuProps {
  isSidebar?: boolean;
}

const HeaderMenu: React.FC<HeaderMenuProps> = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthBackoffice();
  const { getPermissions, permissions } = usePermissionStore();
  const { onLogout } = useAuthBackoffice();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Carregar permissões
  React.useEffect(() => {
    getPermissions();
    console.log("Permissões carregadas:", permissions);
  }, [location.pathname]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      onLogout();
      navigate("/");
    } catch (error) {
      console.error("Erro durante o logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setPendingNavigation(null);
  };

  const handleSaveSpreadsheetModal = (value: string, canNavigate: boolean) => {
    setSpreadsheetInput(value);

    if (canNavigate && pendingNavigation) {
      navigate(pendingNavigation);
      setOpenModal(false);
      setPendingNavigation(null);
    } else {
      setShowErrorToast(true);
    }
  };

  // Função para verificar permissões (igual ao Sidebar)
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
    <AppBar position="static" sx={{ background: colors.primary[400] }}>
      <Toolbar>
        <Box display="flex" alignItems="center" flexGrow={1}>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <MenuOutlinedIcon sx={{ color: colors.grey[100] }} />
          </IconButton>
          <Typography variant="h6" color={colors.grey[100]}>
            Pet Store
          </Typography>
        </Box>

        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          sx={{
            mt: "45px",
            ".MuiPaper-root": {
              backgroundColor: colors.primary[400],
              color: colors.grey[100],
              boxShadow: theme.shadows[4],
            },
          }}
          MenuListProps={{
            sx: {
              backgroundColor: colors.primary[400],
              color: colors.grey[100],
            },
          }}
        >
          <MenuItem onClick={handleMenuClose} component={Link} to="/" sx={{ color: colors.grey[100] }}>
            <HomeOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
            Menu Principal
          </MenuItem>

          {user?.role === "OPERATOR" && (
            <MenuItem onClick={handleMenuClose} component={Link} to="/meu-perfil" sx={{ color: colors.grey[100] }}>
              <PersonOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Meu Perfil
            </MenuItem>
          )}

          {canShowTab("CRIAR_USUARIO") && (
            <MenuItem
              onClick={handleMenuClose}
              component={Link}
              to="/create-form-user"
              sx={{ color: colors.grey[100] }}
            >
              <PersonAddIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Criar Usuário
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_GRUPOS") && (
            <MenuItem onClick={handleMenuClose} component={Link} to="/team" sx={{ color: colors.grey[100] }}>
              <PeopleOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Grupos
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_USUARIOS") && (
            <MenuItem onClick={handleMenuClose} component={Link} to="/users" sx={{ color: colors.grey[100] }}>
              <PeopleOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Usuários
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_OPERADORES") && (
            <MenuItem
              onClick={handleMenuClose}
              component={Link}
              to="/operators-management"
              sx={{ color: colors.grey[100] }}
            >
              <AdminPanelSettingsOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Operadores
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_PLANILHAS") && (
            <MenuItem
              onClick={() => {
                setPendingNavigation("/spreadsheets");
                setOpenModal(true);
                handleMenuClose();
              }}
              sx={{ color: colors.grey[100] }}
            >
              <TableChartOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Planilhas
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_INVOICES") && (
            <MenuItem
              onClick={() => {
                setPendingNavigation("/invoices-management");
                setOpenModal(true);
                handleMenuClose();
              }}
              sx={{ color: colors.grey[100] }}
            >
              <DescriptionOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Invoices
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_TOKENS") && (
            <MenuItem
              onClick={() => {
                setPendingNavigation("/tokens-management");
                setOpenModal(true);
                handleMenuClose();
              }}
              sx={{ color: colors.grey[100] }}
            >
              <DescriptionOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Tokens
            </MenuItem>
          )}

          {canShowTab("GERENCIAR_BOLETOS") && (
            <MenuItem
              onClick={() => {
                setPendingNavigation("/billets-management");
                setOpenModal(true);
                handleMenuClose();
              }}
              sx={{ color: colors.grey[100] }}
            >
              <TableChartOutlinedIcon sx={{ mr: 1, color: colors.greenAccent[500] }} />
              Gerenciar Boletos
            </MenuItem>
          )}
        </Menu>

        {/* Enhanced Modal Component */}
        <EnhancedModal
          open={openModal}
          onClose={handleCloseModal}
          onSave={handleSaveSpreadsheetModal}
          title="Digite a senha de acesso"
          label="Code"
        />

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

        {/* Logout Button */}
        <Button color="inherit" onClick={handleLogout} disabled={loading} sx={{ ml: 2, color: colors.grey[100] }}>
          {loading ? "Saindo..." : "Sair"}
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderMenu;
