import { useState } from "react";
import {
  Box,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { ColorModeContext, useMode } from "../../../theme";
import Topbar from "../../../pages/global/Topbar";
import Sidebar from "../../../pages/global/Sidebar";
import { Outlet, useLocation } from "react-router-dom"; // Hook para acessar a rota atual

export function Layout() {
  // useMode retorna um array, então tipamos como [any, any] temporariamente
  const [theme, colorMode] = useMode() as [any, any];
  // isSidebar será um booleano
  const [isSidebar, setIsSidebar] = useState<boolean>(true);

  // Checa se o tamanho da tela é pequeno (mobile)
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const location = useLocation(); // Pega o caminho atual da rota

  // Rotas onde a Topbar não deve aparecer
  const routesWithoutTopbar = ["/invoices-management", "/tokens-management", "/spreadsheets",  "/billets-management", "/scanner-billets", "/operators-management", "/operators-management2"];

  // Verifica se a rota atual está na lista
  const hideTopbar = routesWithoutTopbar.includes(location.pathname);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          className="app"
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" }, // Coluna no mobile, linha no desktop
            height: "100vh", // Ocupa toda a altura da tela
            overflow: "hidden", // Evita rolagem
          }}
        >
          {/* Renderiza o Sidebar apenas se não for mobile */}
          {!isMobile && <Sidebar isSidebar={isSidebar} />}

          {/* Conteúdo principal */}
          <Box
            className="content"
            sx={{
              flexGrow: 1,
              overflow: "auto", // Permite rolagem horizontal apenas no conteúdo interno
              display: "flex",
              flexDirection: "column",
              height: "100%", // Ocupa o restante da altura
            }}
          >
            {/* Renderiza a Topbar somente se não estiver em uma rota que a oculta */}
            {!hideTopbar && <Topbar setIsSidebar={setIsSidebar} />}
            {/* <Router /> */}
            <Outlet />
          </Box>
        </Box>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
