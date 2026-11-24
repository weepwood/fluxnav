import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/interface.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Cache only the deployed app shell; never cache API requests or user data.
if (import.meta.env.PROD && import.meta.env.MODE !== 'portable' && 'serviceWorker' in navigator && window.isSecureContext && window.top === window.self) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}); });
}
