import React, { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertTriangle, Info, XCircle, X } from "lucide-react";

type ToastType = "info" | "success" | "warning" | "fail";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => {
          let Icon = Info;
          let bgColor = "bg-blue-50 border-blue-500 text-blue-800";
          
          if (toast.type === "success") {
            Icon = CheckCircle;
            bgColor = "bg-green-50 border-green-500 text-green-800";
          } else if (toast.type === "warning") {
            Icon = AlertTriangle;
            bgColor = "bg-yellow-50 border-yellow-500 text-yellow-800";
          } else if (toast.type === "fail") {
            Icon = XCircle;
            bgColor = "bg-red-50 border-red-500 text-red-800";
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 min-w-[300px] p-4 rounded-md border-l-4 shadow-md ${bgColor} animate-in slide-in-from-right fade-in duration-300`}
            >
              <Icon className="w-5 h-5" />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

