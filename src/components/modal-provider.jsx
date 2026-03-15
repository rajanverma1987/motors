"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ModalStackContext = createContext(null);

let nextId = 0;
function generateId() {
  return `modal-${++nextId}`;
}

export function ModalStackProvider({ children }) {
  const [stack, setStack] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      setStack((s) => {
        if (s.length === 0) return s;
        const top = s[s.length - 1];
        top.onClose();
        return s;
      });
      e.preventDefault();
      e.stopPropagation();
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
