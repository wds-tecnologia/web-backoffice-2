import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import { api } from "../../services/api";

interface PasteStepProps {
  nextStep: () => void;
  setBeneficiaryData: React.Dispatch<React.SetStateAction<any>>;
  setDecodedEmv: React.Dispatch<React.SetStateAction<any>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  handleClose: () => void;
}

const QRScannerMobile = ({
  nextStep,
  setBeneficiaryData,
  setDecodedEmv,
  setStep,
  handleClose,
}: PasteStepProps) => {
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >("prompt");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isIosDevice, setIsIosDevice] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null); // Ref para o scanner de QR code

  // Verifica se é iOS
  const checkIsIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) && !/chrome|crios|fxios|edg|opr/.test(userAgent);
    setIsIosDevice(isIosDevice || isSafari);
  };

  // Verifica se a API de permissões é suportada
  const isPermissionsAPISupported = "permissions" in navigator;

  // Função para verificar e solicitar permissão da câmera
  const checkCameraPermission = async () => {
    setIsLoading(true);
    setShowErrorModal(false);

    try {
      if (isPermissionsAPISupported) {
        // Usa a API de permissões para verificar o estado da câmera
        const permissionStatus = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        setCameraPermission(permissionStatus.state);

        permissionStatus.onchange = () => {
          setCameraPermission(permissionStatus.state);
          if (permissionStatus.state === "granted") {
            startQRScanner();
          } else if (permissionStatus.state === "denied") {
            setErrorMessage(
              "Permissão da câmera negada. Por favor, habilite a câmera nas configurações do navegador."
            );
            setShowErrorModal(true);
          }
        };

        if (permissionStatus.state === "granted") {
          startQRScanner();
        } else if (permissionStatus.state === "prompt") {
          // Solicita permissão explicitamente
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop()); // Para a câmera imediatamente
          startQRScanner();
        } else {
          setErrorMessage(
            "Permissão da câmera negada. Por favor, habilite a câmera nas configurações do navegador."
          );
          setShowErrorModal(true);
        }
      } else {
        // Fallback para navegadores que não suportam a API de permissões
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop()); // Para a câmera imediatamente
          startQRScanner();
        } catch (error) {
          setErrorMessage(
            "Não foi possível acessar a câmera. Por favor, habilite a câmera nas configurações do navegador."
          );
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar permissão da câmera:", error);
      setErrorMessage("Erro ao acessar a câmera. Por favor, tente novamente.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Erro ao parar o scanner:", err);
      }
    }
  };

  // Função para iniciar o scanner de QR code
  const startQRScanner = () => {
    const config = {
      fps: 20,
      aspectRatio: isIosDevice ? 1.777 : 1.777, // 16:9
      facingMode: { exact: "environment" }, // Sempre câmera traseira
    };

    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode; // Armazena a instância do scanner

    const errorTimer = setTimeout(() => {
      if (!qrResult) {
        setErrorMessage("Não conseguimos identificar o QR code.");
        setShowErrorModal(true);
        html5QrCode.stop();
      }
    }, 30000);
    setTimeout(() => {
      html5QrCode
        .start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            setQrResult(decodedText);
            html5QrCode.stop();
            clearTimeout(errorTimer);
            const response = await api.post("/pix/decode", {
              content: decodedText,
            });
            setDecodedEmv(response.data);
            setBeneficiaryData({
              name: response?.data?.receiver.name,
              beneficiaryDocument: response?.data?.receiver.document,
              payer_question: response?.data?.payer_question,
              key: response?.data?.pix_key.key,
              amount: response?.data?.amount,
              keyType: response?.data?.pix_key.type,
              id: response?.data?.txid,
              emv: decodedText,
            });
            nextStep();
          },
          (error) => {
            console.error("Erro ao ler o QR code:", error);
          }
        )
        .catch((err) => {
          console.error("Erro ao acessar a câmera:", err);
        });
    }, 500);

    return () => {
      clearTimeout(errorTimer);
      html5QrCode.stop(); // Garante que a câmera seja parada ao desmontar o componente
    };
  };

  // Função para abrir as configurações do navegador
  const openSettings = () => {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      alert("Vá em Ajustes > Safari > Câmera e permita o acesso.");
    } else if (/Android/.test(navigator.userAgent)) {
      alert(
        "Vá em Configurações > Aplicativos > [Nome do Navegador] > Permissões e permita o acesso à câmera."
      );
    } else {
      alert(
        "Por favor, habilite a permissão da câmera nas configurações do seu navegador."
      );
    }
  };

  // Verifica a permissão ao montar o componente
  useEffect(() => {
    checkIsIos();
    checkCameraPermission();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "102%",
        height: isIosDevice ? "120vh" : "120%", // Tela cheia no iOS
        zIndex: 1300,
      }}
    >
      {/* Feedback de Carregamento */}
      {isLoading && (
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
          <p>Inicializando a câmera...</p>
          <div style={{ marginTop: "10px", fontSize: "24px" }}>🌀</div>{" "}
          {/* Animação de carregamento */}
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

      {/* Frase e Ícone de Câmera */}
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
          Aponte a câmera para o QR code para realizar o pagamento
        </p>
      </div>
      {/* Área de Leitura do QR Code */}
      <div
        id="reader"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          minHeight: "150%",
          minWidth: "150%",
          // width: "90%",
          //  height: isIosDevice ? "220%" : "125vh", // Aumenta 25% no iOS
          backgroundImage:
            "linear-gradient(to right, #ff9500, #ff6600, #ff3300)",
          // background: "transparent",
          zIndex: 1300,
        }}
      ></div>

      {/* Overlay da Área de Leitura */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "250px",
          height: "250px",
          border: "2px solid white",
          borderRadius: "12px",
          boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.5)",
          zIndex: 1400,
        }}
      ></div>

      {/* Modal de Erro */}
      {showErrorModal && (
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
              {errorMessage}
            </p>
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "center" }}
            >
              <button
                onClick={() => setStep((prev) => prev - 1)}
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

export default QRScannerMobile;
