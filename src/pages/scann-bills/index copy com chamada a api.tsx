import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { service } from "../../services/ajio";
import { Html5Qrcode } from "html5-qrcode";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import { showAlertError } from "./components/alertError";
import { isAxiosError } from "./components/alertError/isAxiosError";

interface BilletCamProps {
  handleClose: () => void;
}
const ScannBillsBackoffice = ({ handleClose }: BilletCamProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >("prompt");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const navigation = useNavigate();

  // Check if iOS/Safari
  const checkIsIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) && !/chrome|crios|fxios|edg|opr/.test(userAgent);
    setIsIosDevice(isIosDevice || isSafari);
  };

  const isPermissionsAPISupported = "permissions" in navigator;

  const handleNextScreen = async (barCode: string) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await service.post("payments/validate", {
        barCode: barCode.replace(/[\s,-,/]/g, ""),
      });

      navigation("/paybills/info-invoice", {
        state: {
          payment_info: data.payment_info,
          barcode_details: data.barcode_details,
          replace: true,
        },
      });
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          return setIsOpen(true);
        }
        const errorMessage = (error.response?.data as { message: string })
          ?.message;
        showAlertError(errorMessage || "Ocorreu um erro ao validar o boleto.");
      } else {
        showAlertError("Ocorreu um erro inesperado.");
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
          setError(
            "Permissão da câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador."
          );
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
      alert(
        "Vá para Configurações > Apps > [Nome do Navegador] > Permissões e habilite o acesso à câmera."
      );
    } else {
      alert(
        "Por favor, habilite a permissão da câmera nas configurações do seu navegador."
      );
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
          Aponte a câmera para a linha digitável Para poder realizar o registro dos dados
          do boleto.
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
          backgroundImage:
            "linear-gradient(to right, #ff9500, #ff6600, #ff3300)",
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
            <div
              style={{ display: "flex", gap: "8px", justifyContent: "center" }}
            >
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
