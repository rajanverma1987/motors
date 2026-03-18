"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const ModalStackContext = createContext(null);

let nextId = 0;
function generateId() {
  return `modal-${++nextId}`;
}

export function ModalStackProvider({ children }) {
  const [stack, setStack] = useState([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      const s = stackRef.current;
      if (s.length === 0) return;
      const onClose = s[s.length - 1].onClose;
      e.preventDefault();
      e.stopPropagation();
      // Never call onClose synchronously from here: it updates the page that owns the modal,
      // which triggers "Cannot update X while rendering Y" if run inside setStack's updater.
      queueMicrotask(() => onClose());
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const addModal = useCallback((onClose) => {
    const id = generateId();
    setStack((s) => [...s, { id, onClose }]);
    return id;
  }, []);

  const removeModal = useCallback((id) => {
    setStack((s) => s.filter((item) => item.id !== id));
  }, []);

  const value = { stack, addModal, removeModal };

  return (
    <ModalStackContext.Provider value={value}>
      {children}
    </ModalStackContext.Provider>
  );
}

export function useModalStack() {
  return useContext(ModalStackContext);
}
