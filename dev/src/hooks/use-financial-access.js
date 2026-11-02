"use client";

import { useFinancialAccess as useCtxFinancialAccess } from "@/contexts/auth-context";

export function useFinancialAccess() {
  return useCtxFinancialAccess();
}
