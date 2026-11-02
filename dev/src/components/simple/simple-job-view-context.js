"use client";

import { createContext, useContext } from "react";

const SimpleJobViewContext = createContext(null);

export function useSimpleJobView() {
  return useContext(SimpleJobViewContext);
}

export { SimpleJobViewContext };
