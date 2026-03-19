import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform, Dimensions } from "react-native";

/**
 * Scroll a ScrollView so a focused field sits near the vertical center of the
 * space between the nav header and the keyboard.
 *
 * @param {number} headerHeight - from useHeaderHeight() (native stack)
 */
export function useCenterFieldInScroll(headerHeight) {
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const keyboardHeight = useRef(Platform.OS === "ios" ? 336 : 300);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height;
      if (h && h > 0) keyboardHeight.current = h;
    });
    return () => sub.remove();
  }, []);

  const onScroll = useCallback((e) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  /**
   * @param {import('react-native').NativeMethods | null} target - View or TextInput with measureInWindow
   */
  const scrollFieldToCenter = useCallback(
    (target) => {
      if (!target || typeof target.measureInWindow !== "function" || !scrollRef.current) return;

      const run = () => {
        target.measureInWindow((x, y, w, h) => {
          const winH = Dimensions.get("window").height;
          const kb = keyboardHeight.current;
          const topEdge = headerHeight;
          const bottomEdge = winH - kb;
          const visibleH = Math.max(120, bottomEdge - topEdge);
          const visibleCenterY = topEdge + visibleH / 2;
          const inputCenterY = y + h / 2;
          const delta = inputCenterY - visibleCenterY;
          const nextY = Math.max(0, scrollY.current + delta);
          scrollRef.current?.scrollTo({ y: nextY, animated: true });
        });
      };

      requestAnimationFrame(() => {
        setTimeout(run, Platform.OS === "ios" ? 50 : 80);
      });
    },
    [headerHeight]
  );

  return { scrollRef, onScroll, scrollFieldToCenter };
}
