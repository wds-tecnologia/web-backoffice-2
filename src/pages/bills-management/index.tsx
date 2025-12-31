import React, { useEffect, useState } from "react";
import BoletoForm from "./billetsForm/BoletoForm";
import BoletoTable from "./billetsForm/BoletoTable";
import ModalBoleto from "./billetsForm/ModalBoleto";
import { Boleto } from "./billetsForm/types";
import HeaderMenu from "../global/Headerbar";
import { Box, IconButton, InputBase, useMediaQuery, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { SearchIcon } from "lucide-react";
import { api } from "../../services/api";

// Tipagem das Props (se necessário adicionar props no futuro)
interface TopbarProps {
  setIsSidebar?: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebar?: boolean;
}

const BillsManagement: React.FC<TopbarProps> = ({ setIsSidebar, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  // Checa se o tamanho da tela é pequeno (mobile)
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // const [boletos, setBoletos] = useState<Boleto[]>([
  //   {
  //     id: 1,
  //     codigo: "34191790010104351004791020150008287870000002000",
  //     dataPagamento: "2023-05-10",
  //     valor: 150.75,
  //     referencia: "Pagamento referente ao mês de abril",
  //     status: "pendente",
  //   },
  //   {
  //     id: 2,
  //     codigo: "23792790010104351004791020150008287870000003000",
  //     dataPagamento: "2023-05-15",
  //     valor: 230.5,
  //     referencia: "Mensalidade escola - Maio/2023",
  //     status: "pago",
  //   },
  // ]);

  const [boletoEditando, setBoletoEditando] = useState<Boleto | null>(null);

  useEffect(() => {
    api
      .get("/billets/list_billets")
      .then((res) => {
        const adaptados = res.data.map((boleto: any) => {
          const dados = boleto.data?.set ?? {}; // ← ACESSA `set` corretamente
          return {
            id: boleto.id,
            codigo: dados.codigo ?? "n/a",
            dataPagamento: dados.vencimento ?? "",
            valor: dados.valor ?? 0,
            referencia: boleto.description ?? "Sem descrição",
            status: dados.status ?? "pendente",
          };
        });
        setBoletos(adaptados);
      })
      .catch((err) => {
        console.error("Erro ao carregar boletos:", err);
        alert("Erro ao carregar boletos.");
      });
  }, []);

  const addBoleto = (boleto: Boleto) => {
    setBoletos((prevBoletos) => [...prevBoletos, boleto]);
  };

  const openModal = (boletoId: string) => {
    const boleto = boletos.find((b) => b.id === boletoId);
    if (boleto) {
      setBoletoEditando(boleto);
    }
  };

  const closeModal = () => {
    setBoletoEditando(null);
  };

  const saveChanges = (novoStatus: string) => {
    if (boletoEditando) {
      boletoEditando.status = novoStatus;
      setBoletos([...boletos]);
      closeModal();
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
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
        ) : null}
        <h1 className="text-2xl  font-bold text-center mb-6 text-gray-800">Registro de Boletos</h1>
        <BoletoForm addBoleto={addBoleto} />
        <h2 className="bg-white text-xl font-semibold mt-8 mb-4 text-gray-800 border-b pb-2">Boletos Registrados</h2>
        <BoletoTable boletos={boletos} openModal={openModal} />
        {boletoEditando && <ModalBoleto boleto={boletoEditando} closeModal={closeModal} saveChanges={saveChanges} />}
      </div>
    </div>
  );
};

export default BillsManagement;
