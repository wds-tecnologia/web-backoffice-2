import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";
import { api } from "../../services/api";
import { useState } from "react";

interface FormValues {
  name: string;
  userName: string;
  hardPassword: string;
  password: string;
  confirmPassword: string;
}

const FormUser = () => {
  const isNonMobile = useMediaQuery("(min-width:600px)");
  const [loading, setLoading] = useState(false); // Estado para controlar o loading
  const [error, setError] = useState(""); // Estado para capturar erros
  const [openSnackbar, setOpenSnackbar] = useState(false); // Estado para controlar a exibição do Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState(""); // Mensagem do Snackbar
  const [snackbarType, setSnackbarType] = useState<"success" | "error">("success"); // Tipo do Snackbar (sucesso ou erro)
  const [lastUser, setLastUser] = useState<FormValues | null>(null); // Estado para armazenar os dados do último cadastro

  // Função para gerar valores aleatórios
  const generateRandomPassword = () => Math.random().toString(36).slice(-8); // Gera uma senha aleatória
  const generateRandomNickname = () => `@${Math.random().toString(36).slice(2, 8)}`; // Gera um apelido aleatório

  const handleFormSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    setLoading(true); // Ativar o loading
    setError(""); // Limpar qualquer erro anterior
    try {
      const payload = {
        name: values.name,
        userName: values.userName.trim().toLowerCase(),
        hardPassword: values.hardPassword,
        password_hash: values.password,
      };

      const response = await api.post("/graphic/create", payload);

      // Exibe o Snackbar de sucesso
      setSnackbarMessage("Usuário criado com sucesso!");
      setSnackbarType("success");
      setOpenSnackbar(true);
      console.log("Usuário criado com sucesso:", response.data);

      // Armazena os dados do último usuário
      setLastUser(values);
      // Limpa todos os campos do formulário
      resetForm(); // Limpa o formulário após a criação do usuário
    } catch (error) {
      setError("Erro ao criar usuário!"); // Configura a mensagem de erro
      // Exibe o Snackbar de erro
      setSnackbarMessage("Erro ao criar usuário!");
      setSnackbarType("error");
      setOpenSnackbar(true);
      console.error("Erro ao criar usuário:", error);
    } finally {
      setLoading(false); // Desativar o loading após a resposta
    }
  };

  const checkoutSchema = yup.object().shape({
    name: yup.string().required("Nome é obrigatório"),
    userName: yup
      .string()
      .matches(
        /^[a-zA-Z0-9_@.\-]+$/,
        "O nome de usuário deve conter apenas letras, números, underscores, @, . e - sem espaços"
      )
      .required("Nome de usuário é obrigatório"),
    hardPassword: yup.string().required("obrigatório"),
    password: yup.string().required("A senha é obrigatória"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password"), null], "As senhas devem coincidir")
      .required("Confirmar senha é obrigatório"),
  });

  const initialValues: FormValues = {
    name: "",
    hardPassword: "",
    userName: "",
    password: "",
    confirmPassword: "",
  };

  return (
    <Box m="20px">
      <Header title="Novo usuário:" subtitle="Crie um novo perfil de usuário" />
      <Formik initialValues={initialValues} validationSchema={checkoutSchema} onSubmit={handleFormSubmit}>
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue }: any) => (
          <form onSubmit={handleSubmit}>
            <Box
              display="grid"
              gap="30px"
              gridTemplateColumns="repeat(4, minmax(0, 1fr))"
              sx={{
                "& > div": { gridColumn: isNonMobile ? undefined : "span 4" },
              }}
            >
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Nome"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.name}
                name="name"
                error={!!touched.name && !!errors.name}
                helperText={touched.name && errors.name}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Apelido"
                onBlur={handleBlur}
                onChange={(e) => {
                  handleChange({
                    target: {
                      name: "userName",
                      value: e.target.value.replace(/\s/g, ""),
                    },
                  });
                }}
                value={values.userName}
                name="userName"
                error={!!touched.userName && !!errors.userName}
                helperText={touched.userName && errors.userName}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Excluir Dados com Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.hardPassword}
                name="hardPassword"
                error={!!touched.hardPassword && !!errors.hardPassword}
                helperText={touched.hardPassword && errors.hardPassword}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.password}
                name="password"
                error={!!touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth
                variant="filled"
                type="text"
                label="Confirmar Senha"
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.confirmPassword}
                name="confirmPassword"
                error={!!touched.confirmPassword && !!errors.confirmPassword}
                helperText={touched.confirmPassword && errors.confirmPassword}
                sx={{ gridColumn: "span 4" }}
              />
            </Box>
            <Box display="flex" justifyContent="space-between" gap="20px" mt="20px">
              <Box display="flex" gap="20px">
                <Button
                  onClick={() => {
                    const randomPassword = generateRandomPassword();
                    setFieldValue("password", randomPassword); // Preencher o campo de senha
                    setFieldValue("confirmPassword", randomPassword);
                  }}
                  color="primary"
                  variant="contained"
                >
                  Gerar Senha
                </Button>
                <Button
                  onClick={() => setFieldValue("hardPassword", generateRandomPassword())}
                  color="primary"
                  variant="contained"
                >
                  Gerar Senha de Exclusão
                </Button>
                <Button
                  onClick={() => setFieldValue("userName", generateRandomNickname())}
                  color="primary"
                  variant="contained"
                >
                  Gerar Apelido
                </Button>
              </Box>
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  type="submit"
                  color="success"
                  variant="contained"
                  disabled={loading} // Desabilita o botão durante o carregamento
                >
                  Criar usuário
                </Button>
                {loading && <CircularProgress size={24} sx={{ marginLeft: 2 }} />}
              </Box>
            </Box>
          </form>
        )}
      </Formik>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarType}>
          {snackbarMessage}
        </Alert>
      </Snackbar>{" "}
      {/* Exibe os dados do último usuário registrado */}
      {lastUser && (
        <Card sx={{ marginTop: 3, padding: 2, backgroundColor: "primary", boxShadow: 3 }}>
          <CardContent sx={{ marginTop: 3, padding: 2, backgroundColor: "primary[300]", boxShadow: 3 }}>
            <Typography variant="h5">Último Cadastro:</Typography>
            <Typography variant="body1">
              <strong>Nome:</strong> {lastUser.name}
            </Typography>
            <Typography variant="body1">
              <strong>Apelido:</strong> {lastUser.userName}
            </Typography>
            <Typography variant="body1">
              <strong>Senha:</strong> {lastUser.password}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FormUser;
