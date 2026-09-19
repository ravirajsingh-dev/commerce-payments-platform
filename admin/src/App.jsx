import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import store from "./app/store.jsx";
import PortalRoutes from "./app/router/PortalRoutes.jsx";

import { initializeAuth } from "@src/features/auth/authActions";
import { logoutAuth } from "@src/features/auth/authReducer";
import FaviconManager from "@src/components/FaviconManager";
import TitleManager from "@src/components/TitleManager";

const App = () => {
  useEffect(() => {
    store.dispatch(initializeAuth(PortalRoutes));

    const onStorage = (event) => {
      if (event.key === "auth.logout.event") {
        store.dispatch(logoutAuth());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <>
      <FaviconManager />
      <TitleManager />
      <RouterProvider router={PortalRoutes} />
    </>
  );
};

export default App;
