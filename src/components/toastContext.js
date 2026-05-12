import { createContext } from "react";

export const ToastContext = createContext({
  toast: () => {},
  dismiss: () => {},
});
