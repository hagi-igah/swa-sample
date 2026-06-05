import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

interface SystemInfo {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  serverStartTime: string;
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemoryGB: string;
    freeMemoryGB: string;
    cpusCount: number;
  };
  environment: {
    isContainer: string;
    allowedOrigins: string;
    safeVariables: {
      NODE_ENV: string;
      PORT: string;
    };
    allConfiguredKeys: string[];
  };
}

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

function App() {
  // MSAL 認証関連のフック
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  
  // ログイン中のユーザー情報を取得
  const activeAccount = accounts[0];

  // 初期接続先の設定。環境変数がない場合は http://localhost:3000 をデフォルトとする
  const defaultApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const [apiUrl, setApiUrl] = useState<string>(defaultApiUrl);
  
  // 状態管理
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 時間フォーマット用ヘルパー
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // API からデータをロードする
  const loadData = useCallback(async (targetUrl: string) => {
    // 未ログイン時はAPIリクエストを行わない
    if (!isAuthenticated) return;

    setStatus("checking");
    try {
      // 1. システム情報の取得
      const infoRes = await fetch(`${targetUrl}/api/info`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!infoRes.ok) throw new Error("Info endpoint returned error");
      const infoData: SystemInfo = await infoRes.json();
      setSystemInfo(infoData);

      // 2. タスク一覧の取得
      const todosRes = await fetch(`${targetUrl}/api/todos`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!todosRes.ok) throw new Error("Todos endpoint returned error");
      const todosData: Todo[] = await todosRes.json();
      setTodos(todosData);

      setStatus("online");
    } catch (err) {
      console.error("API Connection Error:", err);
      setStatus("offline");
      setSystemInfo(null);
      setTodos([]);
    }
  }, [isAuthenticated]);

  // ログイン状態、URL変更またはリフレッシュトリガー起動時に再接続
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData(apiUrl);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [apiUrl, refreshTrigger, loadData]);

  // ログイン処理 (ポップアップウィンドウ)
  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((e) => {
      console.error("MSAL Login Error:", e);
    });
  };

  // ログアウト処理 (ポップアップ / リダイレクト)
  const handleLogout = () => {
    instance.logoutPopup().catch((e) => {
      console.error("MSAL Logout Error:", e);
    });
  };

  // タスク完了状態のトグル (PATCH)
  const handleToggleTodo = async (todo: Todo) => {
    try {
      const res = await fetch(`${apiUrl}/api/todos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: todo.id,
          completed: !todo.completed,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle todo");
      const updatedTodo: Todo = await res.json();
      
      // クライアント側の状態を同期
      setTodos((prev) =>
        prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
      );
    } catch (err) {
      console.error(err);
      alert("タスクの更新に失敗しました。BFF の接続を確認してください。");
    }
  };

  // 新規タスクの追加 (POST)
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle }),
      });

      if (!res.ok) throw new Error("Failed to add todo");
      const newTodo: Todo = await res.json();

      setTodos((prev) => [...prev, newTodo]);
      setNewTodoTitle("");
    } catch (err) {
      console.error(err);
      alert("タスクの追加に失敗しました。BFF の接続を確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 未ログイン時のウェルカムログイン画面 ---
  if (!isAuthenticated) {
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

  // --- ログイン成功後のメインダッシュボード画面 ---
  return (
    <>
      {/* ダッシュボードヘッダー */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            Azure BFF Integration Dashboard
            <span className="azure-badge">Azure Study</span>
          </h1>
          <p>Azure Static Web Apps (SPA) と Azure Container Apps (Next.js BFF) の通信連携デモ</p>
        </div>

        {/* ログインユーザー情報とログアウトボタン */}
        <div className="url-config-panel" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div style={{ textAlign: "right" }}>
            <span className="url-config-label" style={{ display: "block", fontSize: "10px" }}>Signed in as:</span>
            <span className="info-value" style={{ fontSize: "12px", background: "transparent", padding: 0 }}>
              {activeAccount?.name || activeAccount?.username}
            </span>
          </div>
          <button 
            type="button" 
            className="todo-button" 
            onClick={handleLogout}
            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", boxShadow: "none" }}
          >
            ログアウト
          </button>
        </div>
        
        {/* ダイナミック接続設定 */}
        <div className="url-config-panel" style={{ width: "100%", justifyContent: "space-between", marginTop: "10px" }}>
          <div>
            <span className="url-config-label" style={{ marginRight: "10px" }}>BFF Endpoint:</span>
            <input
              type="text"
              className="url-config-input"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
              style={{ width: "280px" }}
            />
          </div>
          <button 
            type="button" 
            className="todo-button" 
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}
          >
            再接続
          </button>
        </div>
      </header>

      {/* メイングリッド */}
      <main className="dashboard-grid">
        
        {/* 1. バックエンドステータス＆システム情報 */}
        <section className="panel">
          <div className="panel-title">
            <span>BFF Container Status</span>
            <div className={`connection-badge ${status}`}>
              <span className="pulse-dot"></span>
              {status === "online" && "ONLINE / HEALTHY"}
              {status === "offline" && "OFFLINE / DISCONNECTED"}
              {status === "checking" && "CONNECTING..."}
            </div>
          </div>

          {status === "online" && systemInfo ? (
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Node.js Runtime</span>
                <span className="info-value">{systemInfo.system.nodeVersion}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Platform (OS)</span>
                <span className="info-value">{systemInfo.system.platform} ({systemInfo.system.arch})</span>
              </div>
              <div className="info-row">
                <span className="info-label">Container Uptime</span>
                <span className="info-value">{formatUptime(systemInfo.uptimeSeconds)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Memory Utilization</span>
                <span className="info-value">
                  Free: {systemInfo.system.freeMemoryGB} GB / Total: {systemInfo.system.totalMemoryGB} GB
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">CORS Allowed Origins</span>
                <span className="info-value" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {systemInfo.environment.allowedOrigins}
                </span>
              </div>
              <div style={{ marginTop: "12px", textAlign: "left" }}>
                <span className="info-label" style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Active Environment Variables Keys (Azure App Settings):
                </span>
                <div className="env-tags-container">
                  {systemInfo.environment.allConfiguredKeys.map((key) => (
                    <span key={key} className="env-tag">{key}</span>
                  ))}
                  {systemInfo.environment.allConfiguredKeys.length === 0 && (
                    <span className="info-label" style={{ fontStyle: "italic" }}>No env variables found</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="offline-placeholder">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              {status === "checking" ? (
                <p>Next.js BFF ({apiUrl}) に接続中...</p>
              ) : (
                <>
                  <p style={{ fontWeight: 600, color: "var(--accent-error)" }}>BFF コンテナへの接続エラー</p>
                  <p style={{ fontSize: "13px", marginTop: "6px" }}>
                    コンテナサービスが起動していること、CORS 設定が正しいことを確認してください。
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        {/* 2. インタラクティブロードマップタスク管理 */}
        <section className="panel">
          <div className="panel-title">
            <span>Azure Study Roadmap</span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {todos.filter(t => t.completed).length} / {todos.length} 完了
            </span>
          </div>

          {status === "online" ? (
            <>
              <div className="todo-container">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`todo-item ${todo.completed ? "completed" : ""}`}
                    onClick={() => handleToggleTodo(todo)}
                  >
                    <div className="todo-checkbox">
                      <span className="checkmark">✓</span>
                    </div>
                    <span className="todo-title">{todo.title}</span>
                  </div>
                ))}
                {todos.length === 0 && (
                  <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>タスクがありません</p>
                )}
              </div>

              {/* タスクの新規追加フォーム */}
              <form onSubmit={handleAddTodo} className="add-todo-form">
                <input
                  type="text"
                  className="todo-input"
                  placeholder="例: Azure Key Vault で秘密鍵を管理する"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  maxLength={100}
                />
                <button type="submit" className="todo-button" disabled={isSubmitting}>
                  {isSubmitting ? "追加中..." : "追加"}
                </button>
              </form>
            </>
          ) : (
            <div className="offline-placeholder">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 114 0v2m-4 0h4m-4 0a2 2 0 00-2 2v3m4-8a2 2 0 012-2h2a2 2 0 012 2v3m0 0h2a2 2 0 012 2v3"></path>
              </svg>
              <p>オフラインモードのため、ロードマップデータは非表示です</p>
            </div>
          )}
        </section>

      </main>

      {/* Azure デプロイガイド */}
      <footer className="info-alert">
        <strong>💡 MSAL クライアント認証の特徴:</strong><br />
        1. <strong>セキュアなサインイン:</strong> フロントエンドに MSAL を導入することで、SWA無料プランのままでも特定の組織テナントのみにアクセス制限をかけることができます。<br />
        2. <strong>BFF CORS制限の注意:</strong> BFF コンテナと直接通信させる場合、BFF側の環境変数 <code>ALLOWED_ORIGINS</code> にこのアプリの公開ドメインを設定する必要があります。
      </footer>
    </>
  );
}

export default App;
