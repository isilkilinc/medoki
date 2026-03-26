import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LanguageProvider } from "./lib/i18n.tsx";
import { ThemeProvider } from "./lib/theme.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </ThemeProvider>
);
