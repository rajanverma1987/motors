/**
 * Temporarily force light UI theme while the browser print dialog is open.
 * Prevents dark-mode page chrome / tokens from framing printed documents.
 */

/**
 * @returns {() => void} restore
 */
export function beginPrintLightTheme() {
  if (typeof document === "undefined") return () => {};
  const html = document.documentElement;
  const hadDark = html.classList.contains("dark");
  const prevScheme = html.style.colorScheme;
  if (hadDark) html.classList.remove("dark");
  html.style.colorScheme = "light";
  html.dataset.printLightTheme = "1";
  return () => {
    delete html.dataset.printLightTheme;
    html.style.colorScheme = prevScheme;
    if (hadDark) html.classList.add("dark");
  };
}
