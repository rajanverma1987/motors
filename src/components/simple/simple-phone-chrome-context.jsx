"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useIsPhone } from "@/hooks/use-media-query";
import { attachMobileKeyboardZoomRestore } from "@/lib/mobile-viewport";

const SimplePhoneChromeContext = createContext(null);

/**
 * Phone chrome for Simple portal: drawer open state + optional hub tab handlers.
 * Mount once under the Simple dashboard shell.
 */
export function SimplePhoneChromeProvider({ children }) {
  const isPhone = useIsPhone();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hubChrome, setHubChromeState] = useState(null);

  useEffect(() => {
    if (!isPhone) return undefined;
    return attachMobileKeyboardZoomRestore();
  }, [isPhone]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((o) => !o), []);

  const setHubChrome = useCallback((next) => {
    setHubChromeState(next);
  }, []);

  const clearHubChrome = useCallback(() => {
    setHubChromeState(null);
  }, []);

  const value = useMemo(
    () => ({
      isPhone,
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      hubChrome,
      setHubChrome,
      clearHubChrome,
      showBottomNav: Boolean(isPhone && hubChrome?.showBottomNav),
    }),
    [
      isPhone,
      drawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      hubChrome,
      setHubChrome,
      clearHubChrome,
    ]
  );

  return (
    <SimplePhoneChromeContext.Provider value={value}>{children}</SimplePhoneChromeContext.Provider>
  );
}

export function useSimplePhoneChrome() {
  const ctx = useContext(SimplePhoneChromeContext);
  if (!ctx) {
    return {
      isPhone: false,
      drawerOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      hubChrome: null,
      setHubChrome: () => {},
      clearHubChrome: () => {},
      showBottomNav: false,
    };
  }
  return ctx;
}
