import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export function Login() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((e) => {
      console.error("MSAL Login Error:", e);
    });
  };

  return (
    <div className="offline-placeholder" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="panel" style={{ maxWidth: "480px", margin: "0 auto", padding: "40px 30px", textAlign: "center" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "10px", background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Azure SWA Integration
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "30px", lineHeight: "1.6" }}>
          Microsoft Entra ID 認証デモアプリケーションです。<br />
          ダッシュボードを閲覧・操作するには、以下から Microsoft アカウントでサインインしてください。
        </p>
        
        <button 
          type="button" 
          className="todo-button" 
          onClick={handleLogin}
          style={{ width: "100%", height: "46px", fontSize: "16px", borderRadius: "10px" }}
        >
          Microsoft アカウントでログイン
        </button>
      </div>
    </div>
  );
}
