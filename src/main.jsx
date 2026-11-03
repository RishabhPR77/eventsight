import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import { AuthProvider } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { CelebrationProvider } from "./components/ui/Celebration";
import { ConfirmProvider } from "./components/ui/Confirm";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CelebrationProvider>
            <RealtimeProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </RealtimeProvider>
          </CelebrationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
