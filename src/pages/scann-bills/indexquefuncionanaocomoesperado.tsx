import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import axios from "axios";
import { showAlertError } from "./components/alertError";
import { isAxiosError } from "./components/alertError/isAxiosError";

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
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [scannedData, setScannedData] = useState<BilletData | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const navigation = useNavigate();

  // Configuração do Axios
  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      "Content-Type": "application/json",
    },
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
    // Remove todos os caracteres não numéricos
    const cleanCode = barCode.replace(/[^\d]/g, "");

    // Extrai a linha digitável (normalmente os primeiros 47 ou 48 dígitos)
    const digitableLine =
      cleanCode.length >= 47
        ? `${cleanCode.substring(0, 5)}.${cleanCode.substring(5, 10)} ` +
          `${cleanCode.substring(10, 15)}.${cleanCode.substring(15, 21)} ` +
          `${cleanCode.substring(21, 26)}.${cleanCode.substring(26, 32)} ` +
          `${cleanCode.substring(32, 33)} ${cleanCode.substring(33, 47)}`
        : cleanCode;

    // Tenta extrair valor (normalmente posições 37-47 para alguns boletos)
    let amount = "0,00";
    if (cleanCode.length >= 47) {
      const amountStr = cleanCode.substring(37, 47);
      amount = `${amountStr.substring(0, amountStr.length - 2)},${amountStr.substring(amountStr.length - 2)}`;
    }

    // Tenta extrair data de vencimento (normalmente posições 33-37 para alguns boletos)
    let dueDate = "Não identificado";
    if (cleanCode.length >= 37) {
      const julianDate = parseInt(cleanCode.substring(33, 37));
      if (!isNaN(julianDate) && julianDate > 0) {
        // Data base é 07/10/1997 para boletos
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
    try {
      // Converte o valor para o formato numérico esperado pela API
      const numericValue = parseFloat(billetInfo.amount?.replace(".", "").replace(",", ".") || "0");

      // Formata a data para o padrão YYYY-MM-DD
      let formattedDueDate = "0000-00-00";
      if (billetInfo.dueDate && billetInfo.dueDate !== "Não identificado") {
        const [day, month, year] = billetInfo.dueDate.split("/");
        formattedDueDate = `${year}-${month}-${day}`;
      }

      const response = await api.post("/billets/create_billet", {
        name: `Boleto ${billetInfo.barCode.substring(0, 5)}`,
        description: `Boleto capturado via scanner - ${billetInfo.digitableLine}`,
        data: {
          valor: numericValue,
          vencimento: formattedDueDate,
          status: "pendente",
          codigo_barras: billetInfo.barCode,
          linha_digitavel: billetInfo.digitableLine,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao enviar boleto para API:", error);
      throw error;
    }
  };

  const handleNextScreen = async (barCode: string) => {
    setLoading(true);
    setError("");

    try {
      // Extrai informações do boleto
      const billetInfo = extractBilletInfo(barCode);
      setScannedData(billetInfo);

      // Envia para a API
      await sendBilletToAPI(billetInfo);

      // Salva no localStorage
      const savedBillets = JSON.parse(localStorage.getItem("scannedBillets") || "[]");
      savedBillets.push(billetInfo);
      localStorage.setItem("scannedBillets", JSON.stringify(savedBillets));
    } catch (error) {
      console.error("Error processing billet:", error);

      if (isAxiosError(error)) {
        const errorMessage = (error.response?.data as { message: string })?.message;
        setError(errorMessage || "Ocorreu um erro ao processar o boleto. Por favor, tente novamente.");
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

  const closeModal = () => {
    setScannedData(null);
    startQRScanner(); // Reinicia o scanner após fechar o modal
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
            }}
          >
            <h3 style={{ marginBottom: "20px", color: "#333" }}>Dados do Boleto</h3>

            <div style={{ marginBottom: "15px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Código de Barras:</p>
              <p style={{ wordBreak: "break-all" }}>{scannedData.barCode}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Linha Digitável:</p>
              <p>{scannedData.digitableLine}</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Valor:</p>
              <p>R$ {scannedData.amount}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Vencimento:</p>
              <p>{scannedData.dueDate}</p>
            </div>

            <button
              onClick={closeModal}
              style={{
                background: "#004A8A",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: "bold",
                width: "100%",
                cursor: "pointer",
              }}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

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
