import { Outlet } from "react-router";
import { useIsAuthenticated } from "@azure/msal-react";
import { Login } from "./pages/Login";
import "./App.css";

function App() {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Outlet />;
}

export default App;
