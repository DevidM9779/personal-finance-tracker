import { useCallback, useContext } from "react";
import { ToastContext } from "./toastContext";

export function useToast() {
  return useContext(ToastContext);
}

export function useToastedAction() {
  const { toast } = useToast();
  return useCallback(
    async (fn, { successMessage, errorMessage } = {}) => {
      try {
        const result = await fn();
        if (successMessage) toast({ title: successMessage, variant: "success" });
        return result;
      } catch (err) {
        console.error(err);
        toast({
          title: errorMessage || "Something went wrong",
          description: err?.message,
          variant: "error",
        });
        throw err;
      }
    },
    [toast]
  );
}
