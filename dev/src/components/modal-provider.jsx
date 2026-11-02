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

  const syncStack = useCallback((next) => {
    stackRef.current = next;
    setStack(next);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      const s = stackRef.current;
      if (s.length === 0) return;
      const onClose = s[s.length - 1].onClose;
      e.preventDefault();
      e.stopPropagation();
      queueMicrotask(() => onClose());
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const addModal = useCallback(
    (onClose) => {
      const id = generateId();
      syncStack([...stackRef.current, { id, onClose }]);
      return id;
    },
    [syncStack]
  );

  const removeModal = useCallback(
    (id) => {
      syncStack(stackRef.current.filter((item) => item.id !== id));
    },
    [syncStack]
  );

  /** Synchronous stack position for z-index (includes modals registered in the current layout pass). */
  const getStackIndex = useCallback((id) => {
    if (!id) return 0;
    const idx = stackRef.current.findIndex((item) => item.id === id);
    return idx >= 0 ? idx : 0;
  }, []);

  const value = { stack, addModal, removeModal, getStackIndex };

  return <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>;
}

export function useModalStack() {
  return useContext(ModalStackContext);
}
