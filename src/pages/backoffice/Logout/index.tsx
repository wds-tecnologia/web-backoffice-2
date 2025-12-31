/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";

export function Logout() {
  const navigate = useNavigate();
  const { onLogout } = useAuthBackoffice()

  useEffect(() => {
    onLogout()
    navigate("/");
  }, []);

  return <div />;
}
