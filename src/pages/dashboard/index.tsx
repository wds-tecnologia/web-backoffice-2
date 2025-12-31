import { Box, Button, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { mockTransactions } from "../../data/mockData";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EmailIcon from "@mui/icons-material/Email";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TrafficIcon from "@mui/icons-material/Traffic";
import Header from "../../components/Header";
import StatBox from "../../components/StatBox";
import PersonIcon from "@mui/icons-material/Person";
import Groups2Icon from "@mui/icons-material/Groups2"; 
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useAuthBackoffice } from "../../hooks/authBackoffice";

// Defina o tipo para os dados dos usuários
interface User {
  id: string;
  name: string;
  userName: string;
  role: string;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useAuthBackoffice();
  // Estado para armazenar o número de usuários
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [totalGrupos, setTotalGrupos] = useState<number>(0);
  const [users, setUsers] = useState<User[]>([]);

  // Checa se o tamanho da tela é pequeno (mobile)
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Função para formatar o nome do usuário
  const formatUserName = (name: string) => {
    if (!name) return "Usuário";

    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0];
    } else if (nameParts.length === 2) {
      return `${nameParts[0]} ${nameParts[1]}`;
    } else {
      // Se tem mais de 2 nomes, mostra primeiro, inicial do segundo, e último
      const first = nameParts[0];
      const secondInitial = nameParts[1] ? nameParts[1][0] + "." : "";
      const last = nameParts[nameParts.length - 1];
      return `${first} ${secondInitial} ${last}`;
    }
  };

  console.log("Total de usuários:", users);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");
        if (!token) {
          console.error("Token não encontrado!");
          return;
        }

        const response = await api.get("/graphic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const responseGroups = await api.get("/group/list-all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Dados recebidos de usuarios______>>>>>>>>>>>>>>:", response.data);

        // Atualize o estado com os dados dos usuários
        setUsers(response.data);
        // Contando o número de Grupos
        setTotalGrupos(responseGroups.data.length); // Assumindo que a resposta seja um array de usuários
        // Contando o número de usuários
        setTotalUsuarios(response.data.length); // Assumindo que a resposta seja um array de usuários
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <Box borderRadius={"5px"} m="20px">
      {/* HEADER */}
      <Box borderRadius={"5px"} display="flex" justifyContent="space-between" alignItems="center">
        <Header
          title={isMobile ? formatUserName(user?.name || "") : "BACKOFFICE"}
          subtitle="seja bem vindo ao seu backoffice:"
        />

        {!isMobile ? (
          <Box borderRadius={"5px"}>
            <Button
              sx={{
                backgroundColor: colors.blueAccent[700],
                color: colors.grey[100],
                fontSize: "14px",
                fontWeight: "bold",
                padding: "10px 20px",
              }}
            >
              <DownloadOutlinedIcon sx={{ mr: "10px" }} />
              Download de alguma coisa
            </Button>
          </Box>
        ) : null}
      </Box>

      {/* GRID & CHARTS */}
      <Box
        borderRadius={"5px"}
        display="grid"
        gridTemplateColumns={isMobile ? "repeat(6, 1fr)" : "repeat(12, 1fr)"}
        gridAutoRows="140px"
        gap="20px"
      >
        {/* ROW 1 */}
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalGrupos.toString()}
            subtitle="Total de grupos"
            progress="0.75"
            increase="+14%"
            icon={<Groups2Icon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title={totalUsuarios.toString()}
            subtitle="Total de usuários"
            progress="0.30"
            increase="+5%"
            icon={<PersonIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title="431,225"
            subtitle="Total de chamadas"
            progress="0.50"
            increase="+21%"
            icon={<PointOfSaleIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        <Box
          borderRadius={"5px"}
          gridColumn={!isMobile ? "span 3" : "span 3"}
          sx={{
            backgroundColor: colors.primary[400],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatBox
            title="1,325,134"
            subtitle="Total de mensagens"
            progress="0.80"
            increase="+43%"
            icon={<EmailIcon sx={{ color: colors.greenAccent[600], fontSize: "26px" }} />}
          />
        </Box>
        {/* ROW 2 */}
        {!isMobile ? (
          <Box
            borderRadius={"5px"}
            gridColumn="span 8"
            gridRow="span 2"
            sx={{
              backgroundColor: colors.primary[400],
            }}
          >
            <Box
              borderRadius={"5px"}
              mt="25px"
              p="0 30px"
              display="flex "
              justifyContent="space-between"
              alignItems="center"
            >
              <Box borderRadius={"5px"}>
                <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
                  Alguma metrica aqui
                </Typography>
                <Typography variant="h3" fontWeight="bold" color={colors.greenAccent[500]}>
                  COLOCAR ALGUMA COISA AQUI APENAS EXEMPLO:
                </Typography>
              </Box>
              <Box borderRadius={"5px"}>
                <IconButton>
                  <DownloadOutlinedIcon sx={{ fontSize: "26px", color: colors.greenAccent[500] }} />
                </IconButton>
              </Box>
            </Box>
            <Box borderRadius={"5px"} height="250px" m="-20px 0 0 0">
              {/* <LineChart isDashboard={true} /> */}
            </Box>
          </Box>
        ) : null}

        <Box
          gridColumn={isMobile ? "span 6" : "span 4"} // Ajusta a coluna dependendo se é mobile ou não
          borderRadius={"5px"}
          //gridColumn="span 4"
          gridRow="span 2"
          sx={{
            backgroundColor: colors.primary[400],
          }}
          overflow="auto"
        >
          <Box
            borderRadius="5px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: `4px solid ${colors.greenAccent[500]}`,
              color: colors.grey[100],
              backgroundColor: colors.blueAccent[700],
              p: "15px",
            }}
          >
            <Typography color={colors.greenAccent[100]} variant="h5" fontWeight="600">
              Novos Usuários
            </Typography>
          </Box>
          {users.map((user) => (
            <Box
              borderRadius={"5px"}
              key={`${user.id}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`4px solid ${colors.primary[500]}`}
              p="15px"
              gap="80px" /* Adicionado para controlar o espaçamento entre os itens */
              sx={{ "&:hover": { backgroundColor: colors.blueAccent[400] } }}
            >
              <Box
                borderRadius={"5px"}
                flex="1" /* Adicionado para ajustar o espaço proporcionalmente */
                overflow="hidden" /* Previne que o texto ultrapasse */
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                <Typography color={colors.greenAccent[500]} variant="h5" fontWeight="600">
                  {user.userName}
                </Typography>
                <Typography color={colors.grey[100]}>{user.name}</Typography>
              </Box>
              <Box
                borderRadius={"5px"}
                color={colors.grey[100]}
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexShrink={0} /* Evita que este elemento seja redimensionado */
              >
                {new Date(user.created_at).toLocaleDateString()}
              </Box>
              <Box
                borderRadius={"5px"}
                flexShrink={0} /* Evita que este elemento seja redimensionado */
                sx={{
                  backgroundColor: colors.greenAccent[500],
                }}
                p="5px 10px"
              >
                {user.status === "active" ? (
                  <Typography color={colors.grey[100]}>Ativo</Typography>
                ) : (
                  <Typography color={colors.grey[100]}>Inativo</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
