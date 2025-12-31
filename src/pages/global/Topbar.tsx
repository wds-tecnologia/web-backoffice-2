import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { useContext } from "react";
import { ColorModeContext, tokens } from "../../theme";
import InputBase from "@mui/material/InputBase";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";
import HeaderMenu from "./Headerbar";

// Tipagem das Props (se necessário adicionar props no futuro)
interface TopbarProps {
  setIsSidebar?: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebar?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ setIsSidebar, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);

  // Checa se o tamanho da tela é pequeno (mobile)
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box display="flex" justifyContent="space-between" p={2}>
      {/* SEARCH BAR */}

      {isMobile ? (
        <Box
          display="flex"
          sx={{
            backgroundColor: colors.primary[400],
            borderRadius: "3px",
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: isSidebar ? "250px" : "80px" }, // Responsivo
              flexShrink: 0, // Evita que a largura da sidebar mude
            }}
          >
            <HeaderMenu isSidebar={isSidebar} />
          </Box>
        </Box>
      ) : (
        <Box
          display="flex"
          sx={{
            backgroundColor: colors.primary[400],
            borderRadius: "3px",
          }}
        >
          {/* <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Pesquisar..." />
          <IconButton type="button" sx={{ p: 1 }}>
            <SearchIcon />
          </IconButton> */}
        </Box>
      )}

      {/* ICONS */}
      <Box display="flex">
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
        <IconButton>
          <NotificationsOutlinedIcon />
        </IconButton>
        <IconButton>
          <SettingsOutlinedIcon />
        </IconButton>
        <IconButton>
          <PersonOutlinedIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
