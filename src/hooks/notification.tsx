import { createContext, ReactNode, useContext, useState } from "react";

interface OpenNotification {
  title: string;
  notification: string;
  type: "success" | "error" | "warning";
}

type NotificationContextData = {
  open: boolean;
  title: string;
  content: string;
  type: "success" | "error" | "warning";
  setOpenNotification(data: OpenNotification): any;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const NotificationContext = createContext({} as NotificationContextData);

export function NotificationProvider({ children }: AuthProviderProps) {
  const [open, setOpen] = useState<any>(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"success" | "error" | "warning">("success");

  function setOpenNotification({
    title,
    notification,
    type,
  }: OpenNotification) {
    setOpen(!open);
    setTitle(title);
    setContent(notification);
    setType(type);

    setTimeout(() => {
      setOpen(false);
    }, 5000);
  }

  return (
    <NotificationContext.Provider
      value={{ open, setOpenNotification, title, content, type }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  return context;
}
