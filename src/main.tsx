import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "@/App";
import "@/index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

// HashRouter keeps deep links working when the built prototype is opened from a
// static host or file, without server rewrite rules.
createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
