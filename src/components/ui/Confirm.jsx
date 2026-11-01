import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Button from "./Button";
import Modal, { ModalBody, ModalFooter } from "./Modal";

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((next) => {
    setOptions(next);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = useCallback((answer) => {
    resolver.current?.(answer);
    setOptions(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal open={Boolean(options)} onClose={() => finish(false)} title={options?.title || ""} size="sm">
        <ModalBody>
          <p className="text-ink-soft">{options?.message}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => finish(false)}>{options?.cancelLabel || "Cancel"}</Button>
          <Button variant={options?.danger ? "danger" : "primary"} onClick={() => finish(true)}>
            {options?.confirmLabel || "Confirm"}
          </Button>
        </ModalFooter>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
