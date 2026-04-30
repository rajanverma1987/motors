"use client";

import { useEffect } from "react";

const SCRIPT_ID = "contextual-ai-systems-widget";
const WIDGET_SRC = "https://contextualaisystems.com/widget.js";

export default function ContextualAiWidget() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(SCRIPT_ID)) return;

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = WIDGET_SRC;
    s.async = true;
    s.setAttribute("data-tenant", "a907b16d-fc11-45c9-b7db-663658c3d13d");
    s.setAttribute("data-ai-system", "0a941bd9-6f86-4118-94cb-734df37836e4");
    document.body.appendChild(s);
  }, []);

  return null;
}
