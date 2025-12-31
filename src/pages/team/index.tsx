import { tokens } from "../../theme";
import { mockDataTeam } from "../../data/mockData";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../components/Header";
import { use, useEffect, useState } from "react";
import { api } from "../../services/api";
import { Alert, Box, Button, Snackbar, Typography, useTheme } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataGrid, GridColumns, GridAlignment } from "@mui/x-data-grid";

interface RowData {
  userName: string;
  id: number;
  name: string;
  age: number;
  accessLevel: "admin" | "manager" | "user";
  id_group: string;
}

const Team: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Estado para armazenar dados da API
  const [loading, setLoading] = useState(true);

  // Estado para armazenar os dados da API
  const [rows, setRows] = useState<RowData[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"error" | "success" | "info" | "warning">("info"); // Define um valor padrão

  // Buscando os dados da API
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Adicionando o token ao header da requisição
        const token = localStorage.getItem("@backoffice:token"); // Ajuste para o método que você usa para armazenar o token
        const response = await api.get("/group/list-all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Dados recebidos______>>>>>>>>>>>>>>:", response.data);

        // Mapeando os dados para o formato esperado pelo DataGrid
        const formattedData = response.data.map((group: any, index: any) => ({
          id: index + 1, // Adiciona um ID para o DataGrid
          owner: group.ownerUserName, // Ajuste conforme os dados retornados da API
          createdAt: group.created_at, // Quantidade de usuários no grupo
          name: group.name, // Nome do grupo
          description: group.description, // Nível de acesso
          users: group.members.length, // Número de membros do grupo          access: group.accessLevel,
          id_group: group.id,
        }));

        setRows(formattedData);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);
  /////////////////////////////////////

  const handleClose = () => {
    setOpen(false);
  };

  // Função que será chamada ao clicar no botão de delete
  const handleDelete = async (id: string, name: string) => {
    try {
      // Obtendo o JWT token de localStorage
      const token = localStorage.getItem("@backoffice:token");

      if (!token) {
        console.error("Token não encontrado!");
        return;
      }

      console.log("Token encontrado:", token);

      // Adicionando o token ao header da requisição
      const response = await api.delete("/group/delete", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: { id }, // Garante que o id é enviado corretamente
      });

      console.log("Grupo excluído com sucesso:", response.data);

      // Atualiza a lista de usuários ou remove o usuário da interface
  setRows((prevRows) => prevRows.filter((row) => row.name !== name && row.id_group !== id));

      // Realizar a exclusão
      setMessage(`Grupo ${response.data.name} excluído com sucesso.`);
      setSeverity("success");
      setOpen(true);
    } catch (error) {
      setMessage(`Erro ao excluir Grupo ${name} do sistema.`);
      setSeverity("error");
      setOpen(true);
    }
  };

  //////////////////////////////
  const columns = [
    { field: "id", headerName: "ID" },
    {
      field: "owner",
      headerName: "Gestor",
      flex: 1,
      cellClassName: "name-column--cell",
    },
    {
      field: "name",
      headerName: "Nome do Grupo",
      flex: 1,
    },
    {
      field: "users",
      headerName: "QD. Usuarios",
      type: "number",
      headerAlign: "left" as GridAlignment,
      align: "left" as GridAlignment,
    },
    {
      field: "description",
      headerName: "Descricão",
      flex: 1,
    },
    // {
    //   field: "action",
    //   headerName: "Ação",
    //   flex: 1,
    //   renderCell: (params: any) => (
    //     <Box
    //       width="60%"
    //       m="0 auto"
    //       p="5px"
    //       display="flex"
    //       justifyContent="center"
    //       sx={{ cursor: "pointer", backgroundColor: "red" }}
    //       borderRadius="4px"
    //     >
    //       <Button
    //         variant="contained"
    //         color="error"
    //         startIcon={<DeleteIcon />}
    //         onClick={() => handleDelete(params.row.id_group, params.row.name)}
    //         // Passa o ID ou userName
    //       >
    //         Excluir
    //       </Button>
    //     </Box>
    //   ),
    // },
  ];

  return (
    <Box m="20px">
      <Header title="Grupos" subtitle="Gerenciamento total de grupos" />
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
        }}
      >
        <DataGrid checkboxSelection rows={rows} columns={columns} loading={loading} />
      </Box>
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

export default Team;
