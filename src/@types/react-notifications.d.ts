// src/@types/react-notifications.d.ts
declare module 'react-notifications' {
    export const NotificationManager: {
      success: (message: string, title?: string, timeOut?: number) => void;
      error: (message: string, title?: string, timeOut?: number) => void;
    };
  }
  