import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { IoArrowBack, IoCamera, IoCheckmarkDone } from "react-icons/io5";
import { FaBarcode, FaMoneyBillWave, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import { showAlertError } from "./components/alertError";
import { isAxiosError } from "./components/alertError/isAxiosError";
import { getMockBillet, simulateApiResponse } from "./billetMocks";

interface BilletCamProps {
  handleClose: () => void;
}

interface BilletData {
  barCode: string;
  digitableLine: string;
  amount?: string;
  dueDate?: string;
  beneficiary?: string;
  timestamp: number;
}

const ScannBillsBackoffice = ({ handleClose }: BilletCamProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraPermission, setCameraPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >("prompt");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [scannedData, setScannedData] = useState<BilletData | null>(null);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mockIndex, setMockIndex] = useState(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigation = useNavigate();
// Configuração do Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Adicione também um interceptor para logs em desenvolvimento
api.interceptors.request.use(config => {
  if (process.env.REACT_APP_ENV === 'development') {
    console.log('Enviando requisição para:', config.url);
  }
  return config;
});

api.interceptors.response.use(response => {
  if (process.env.REACT_APP_ENV === 'development') {
    console.log('Resposta recebida de:', response.config.url);
  }
  return response;
}, error => {
  if (process.env.REACT_APP_ENV === 'development') {
    console.error('Erro na requisição:', error);
  }
  return Promise.reject(error);
});

  // Check if iOS/Safari
  const checkIsIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|edg|opr/.test(userAgent);
    setIsIosDevice(isIosDevice || isSafari);
  };

  const isPermissionsAPISupported = "permissions" in navigator;

  // Função para extrair informações do código de barras
  const extractBilletInfo = (barCode: string): BilletData => {
    
    if (barCode.startsWith("mock_")) {
      const mockId = parseInt(barCode.replace("mock_", ""));
      const mock = getMockBillet(mockId);
      return {
        barCode: mock.barCode,
        digitableLine: mock.digitableLine,
        amount: mock.amount,
        dueDate: mock.dueDate,
        beneficiary: mock.beneficiary,
        timestamp: Date.now()
      };
    }
   
    const cleanCode = barCode.replace(/[^\d]/g, "");

    const digitableLine =
      cleanCode.length >= 47
        ? `${cleanCode.substring(0, 5)}.${cleanCode.substring(5, 10)} ` +
          `${cleanCode.substring(10, 15)}.${cleanCode.substring(15, 21)} ` +
          `${cleanCode.substring(21, 26)}.${cleanCode.substring(26, 32)} ` +
          `${cleanCode.substring(32, 33)} ${cleanCode.substring(33, 47)}`
        : cleanCode;

    let amount = "0,00";
    if (cleanCode.length >= 47) {
      const amountStr = cleanCode.substring(37, 47);
      amount = `${amountStr.substring(0, amountStr.length - 2)},${amountStr.substring(amountStr.length - 2)}`;
    }

    let dueDate = "Não identificado";
    if (cleanCode.length >= 37) {
      const julianDate = parseInt(cleanCode.substring(33, 37));
      if (!isNaN(julianDate) && julianDate > 0) {
        const baseDate = new Date(1997, 9, 7);
        baseDate.setDate(baseDate.getDate() + julianDate);
        dueDate = baseDate.toLocaleDateString("pt-BR");
      }
    }

    return {
      barCode: cleanCode,
      digitableLine,
      amount,
      dueDate,
      beneficiary: "Beneficiário não identificado",
      timestamp: Date.now(),
    };
  };

  // Função para enviar dados do boleto para a API
  const sendBilletToAPI = async (billetInfo: BilletData) => {
    setApiStatus("loading");
    
    try {
      // Verifica se é um mock
      const isMock = billetInfo.barCode === getMockBillet(mockIndex).barCode;
      
      if (isMock) {
        const mock = getMockBillet(mockIndex);
        await simulateApiResponse(mock);
        setApiStatus("success");
      } else {
        // Implementação real da API
        const numericValue = parseFloat(billetInfo.amount?.replace(".", "").replace(",", ".") || "0");
        let formattedDueDate = "0000-00-00";
        
        if (billetInfo.dueDate && billetInfo.dueDate !== "Não identificado") {
          const [day, month, year] = billetInfo.dueDate.split("/");
          formattedDueDate = `${year}-${month}-${day}`;
        }

        await api.post("/billets/create_billet", {
          name: `Boleto ${billetInfo.barCode.substring(0, 5)}`,
          description: `Boleto capturado via scanner - ${billetInfo.digitableLine}`,
          data: {
            valor: numericValue,
            vencimento: formattedDueDate,
            status: "pendente",
            codigo_barras: billetInfo.barCode,
            linha_digitavel: billetInfo.digitableLine
          }
        });

        setApiStatus("success");
      }
      
      // Salva no localStorage
      const savedBillets = JSON.parse(localStorage.getItem('scannedBillets') || '[]');
      savedBillets.push(billetInfo);
      localStorage.setItem('scannedBillets', JSON.stringify(savedBillets));
      
    } catch (error) {
      console.error("Erro ao enviar boleto para API:", error);
      setApiStatus("error");
      throw error;
    }
  };

  const handleNextScreen = async (barCode: string) => {
    setLoading(true);
    setError("");

    try {
      const billetInfo = extractBilletInfo(barCode);
      setScannedData(billetInfo);
      await sendBilletToAPI(billetInfo);
    } catch (error) {
      if (isAxiosError(error)) {
        const errorMessage = (error.response?.data as { message: string })?.message;
        setError(errorMessage || "Ocorreu um erro ao processar o boleto.");
      } else {
        setError("Ocorreu um erro inesperado ao processar o boleto.");
      }
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const startQRScanner = () => {
    const config = {
      fps: 20,
      aspectRatio: isIosDevice ? 1.777 : 1.777,
      facingMode: { exact: "environment" },
    };

    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          html5QrCode.stop();
          handleNextScreen(decodedText);
        },
        (error) => {
          console.error("Erro ao ler a linha digitável:", error);
        }
      )
      .catch((err) => {
        console.error("Camera access error:", err);
        setError("Erro ao acessar a câmera. Por favor, tente novamente.");
      });
  };

  const closeModal = () => {
    setScannedData(null);
    setApiStatus("idle");
    handleClose();
  };

  const scanAgain = () => {
    setScannedData(null);
    setApiStatus("idle");
    startQRScanner();
  };

  // ... (restante das funções permanecem iguais: checkCameraPermission, openSettings, handleCloseCamera)
  // Camera permission handling
  const checkCameraPermission = async () => {
    setIsLoadingCamera(true);
    try {
      if (isPermissionsAPISupported) {
        const permissionStatus = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        setCameraPermission(permissionStatus.state);

        permissionStatus.onchange = () => {
          setCameraPermission(permissionStatus.state);
          if (permissionStatus.state === "granted") {
            startQRScanner();
          } else if (permissionStatus.state === "denied") {
            setError(
              "Permissão da câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador."
            );
          }
        };

        if (permissionStatus.state === "granted") {
          startQRScanner();
        } else if (permissionStatus.state === "prompt") {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          startQRScanner();
        } else {
          setError("Permissão da câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador.");
        }
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          startQRScanner();
        } catch (error) {
          setError(
            "Não foi possível acessar a câmera. Por favor, habilite o acesso à câmera nas configurações do navegador."
          );
        }
      }
    } catch (error) {
      console.error("Camera permission error:", error);
      setError("Erro ao acessar a câmera. Por favor, tente novamente.");
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const openSettings = () => {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      alert("Vá para Configurações > Safari > Câmera e habilite o acesso.");
    } else if (/Android/.test(navigator.userAgent)) {
      alert("Vá para Configurações > Apps > [Nome do Navegador] > Permissões e habilite o acesso à câmera.");
    } else {
      alert("Por favor, habilite a permissão da câmera nas configurações do seu navegador.");
    }
  };

  const handleCloseCamera = async () => {
    await stopScanner();
    navigation("/paybills");
  };

  useEffect(() => {
    checkIsIos();
    checkCameraPermission();
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "102%",
        height: isIosDevice ? "120vh" : "120%",
        zIndex: 1300,
      }}
    >
      {/* ... (código anterior do scanner permanece igual) ... */}
      {isLoadingCamera && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#fff",
            fontSize: "18px",
            textAlign: "center",
          }}
        >
          <p>Inicializando câmera...</p>
          <div style={{ marginTop: "10px", fontSize: "24px" }}>🌀</div>
        </div>
      )}

      {/* Seta de Voltar */}
      <button
        onClick={async () => {
          await stopScanner();
          handleClose();
        }}
        type="button"
        style={{
          position: "absolute",
          top: "40px",
          left: "20px",
          background: "transparent",
          border: "none",
          color: "white",
          fontSize: "24px",
          zIndex: 1600,
        }}
      >
        <IoArrowBack />
      </button>

      <div
        style={{
          position: "absolute",
          top: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "white",
          zIndex: 1600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <IoCamera style={{ fontSize: "24px" }} />
        <p style={{ fontSize: "16px", fontWeight: "500" }}>
          Aponte a câmera para a linha digitável Para poder realizar o registro dos dados do boleto.
        </p>
      </div>

      <div
        id="reader"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          minHeight: "150%",
          minWidth: "150%",
          backgroundImage: "linear-gradient(to right, #ff9500, #ff6600, #ff3300)",
          zIndex: 1300,
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "350px",
          height: "200px",
          border: "2px solid white",
          borderRadius: "12px",
          boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.5)",
          zIndex: 1400,
        }}
      ></div>

      {/* Modal com dados do boleto */}
      {scannedData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              width: "90%",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            {apiStatus === "loading" ? (
              <div style={{ padding: "20px" }}>
                <div
                  className="spinner"
                  style={{
                    width: "50px",
                    height: "50px",
                    margin: "0 auto 20px",
                    border: "5px solid #f3f3f3",
                    borderTop: "5px solid #004A8A",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ fontSize: "18px", color: "#555" }}>Enviando boleto para o servidor...</p>
              </div>
            ) : apiStatus === "success" ? (
              <>
                <div
                  style={{
                    backgroundColor: "#e6f7ee",
                    borderRadius: "50%",
                    width: "60px",
                    height: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 15px",
                  }}
                >
                  <IoCheckmarkDone style={{ color: "#28a745", fontSize: "30px" }} />
                </div>
                <h3 style={{ marginBottom: "15px", color: "#28a745" }}>Boleto salvo com sucesso!</h3>

                <div
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    padding: "15px",
                    marginBottom: "20px",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <FaBarcode style={{ marginRight: "10px", color: "#004A8A" }} />
                    <div>
                      <p style={{ fontWeight: "bold", margin: 0 }}>Código de Barras</p>
                      <p style={{ margin: 0, wordBreak: "break-all" }}>{scannedData.barCode}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <FaMoneyBillWave style={{ marginRight: "10px", color: "#004A8A" }} />
                    <div>
                      <p style={{ fontWeight: "bold", margin: 0 }}>Valor</p>
                      <p style={{ margin: 0 }}>R$ {scannedData.amount}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center" }}>
                    <FaCalendarAlt style={{ marginRight: "10px", color: "#004A8A" }} />
                    <div>
                      <p style={{ fontWeight: "bold", margin: 0 }}>Vencimento</p>
                      <p style={{ margin: 0 }}>{scannedData.dueDate}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={closeModal}
                    style={{
                      flex: 1,
                      background: "transparent",
                      color: "#004A8A",
                      border: "1px solid #004A8A",
                      padding: "10px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={scanAgain}
                    style={{
                      flex: 1,
                      background: "#004A8A",
                      color: "white",
                      border: "none",
                      padding: "10px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Escanear Novo
                  </button>
                </div>
              </>
            ) : apiStatus === "error" ? (
              <>
                <div
                  style={{
                    backgroundColor: "#fde8e8",
                    borderRadius: "50%",
                    width: "60px",
                    height: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 15px",
                  }}
                >
                  <span style={{ color: "#dc3545", fontSize: "30px" }}>!</span>
                </div>
                <h3 style={{ marginBottom: "15px", color: "#dc3545" }}>Erro ao salvar boleto</h3>
                <p style={{ color: "#6c757d", marginBottom: "20px" }}>{error || "Tente novamente mais tarde."}</p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={closeModal}
                    style={{
                      flex: 1,
                      background: "transparent",
                      color: "#004A8A",
                      border: "1px solid #004A8A",
                      padding: "10px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={scanAgain}
                    style={{
                      flex: 1,
                      background: "#004A8A",
                      color: "white",
                      border: "none",
                      padding: "10px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Tentar Novamente
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ... (restante do código permanece igual) ... */}

      {error && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              width: "80%",
              maxWidth: "300px",
            }}
          >
            <p
              style={{
                fontSize: "18px",
                fontWeight: "500",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                onClick={handleCloseCamera}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#004A8A",
                  fontSize: "16px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IoArrowBack />
                Voltar
              </button>
              {cameraPermission === "denied" && (
                <button
                  onClick={openSettings}
                  style={{
                    background: "#004A8A",
                    border: "none",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "600",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Habilitar Permissão
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannBillsBackoffice;
