import React, { useState, useEffect } from "react";
import { useLoaderData, useRevalidator, useSearchParams } from "react-router";
import { useMsal } from "@azure/msal-react";
import type { DashboardLoaderData, Todo } from "./dashboardLoader";

export function Dashboard() {
  const { instance, accounts } = useMsal();
  const activeAccount = accounts[0];

  const data = useLoaderData() as DashboardLoaderData;
  const revalidator = useRevalidator();
  const [, setSearchParams] = useSearchParams();

  // Local state for the input field so typing is responsive
  const [inputApiUrl, setInputApiUrl] = useState(data.apiUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");

  // Update input if loader API URL changes
  useEffect(() => {
    setInputApiUrl(data.apiUrl);
  }, [data.apiUrl]);

  // Uptime formatting helper
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => {
      console.error("MSAL Logout Error:", e);
    });
  };

  const handleReconnect = () => {
    setSearchParams((prev) => {
      prev.set("apiUrl", inputApiUrl);
      return prev;
    });
  };

  // Task completed toggle
  const handleToggleTodo = async (todo: Todo) => {
    try {
      const res = await fetch(`${data.apiUrl}/api/todos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: todo.id,
          completed: !todo.completed,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle todo");
      
      // Re-fetch loader data
      revalidator.revalidate();
    } catch (err) {
      console.error(err);
      alert("タスクの更新に失敗しました。BFF の接続を確認してください。");
    }
  };

  // Add todo
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${data.apiUrl}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle }),
      });

      if (!res.ok) throw new Error("Failed to add todo");
      
      setNewTodoTitle("");
      // Re-fetch loader data
      revalidator.revalidate();
    } catch (err) {
      console.error(err);
      alert("タスクの追加に失敗しました。BFF の接続を確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            Azure BFF Integration Dashboard
            <span className="azure-badge">Azure Study</span>
          </h1>
          <p>Azure Static Web Apps (SPA) と Azure Container Apps (Next.js BFF) の通信連携デモ</p>
        </div>

        {/* User Account Info & Logout */}
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
        
        {/* Dynamic Connection Configuration */}
        <div className="url-config-panel" style={{ width: "100%", justifyContent: "space-between", marginTop: "10px" }}>
          <div>
            <span className="url-config-label" style={{ marginRight: "10px" }}>BFF Endpoint:</span>
            <input
              type="text"
              className="url-config-input"
              value={inputApiUrl}
              onChange={(e) => setInputApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
              style={{ width: "280px" }}
            />
          </div>
          <button 
            type="button" 
            className="todo-button" 
            onClick={handleReconnect}
            disabled={revalidator.state === "loading"}
            style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}
          >
            {revalidator.state === "loading" ? "接続中..." : "再接続"}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        
        {/* 1. Backend Status & System Info */}
        <section className="panel">
          <div className="panel-title">
            <span>BFF Container Status</span>
            <div className={`connection-badge ${data.status}`}>
              <span className="pulse-dot"></span>
              {data.status === "online" && "ONLINE / HEALTHY"}
              {data.status === "offline" && "OFFLINE / DISCONNECTED"}
            </div>
          </div>

          {data.status === "online" && data.systemInfo ? (
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Node.js Runtime</span>
                <span className="info-value">{data.systemInfo.system.nodeVersion}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Platform (OS)</span>
                <span className="info-value">{data.systemInfo.system.platform} ({data.systemInfo.system.arch})</span>
              </div>
              <div className="info-row">
                <span className="info-label">Container Uptime</span>
                <span className="info-value">{formatUptime(data.systemInfo.uptimeSeconds)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Memory Utilization</span>
                <span className="info-value">
                  Free: {data.systemInfo.system.freeMemoryGB} GB / Total: {data.systemInfo.system.totalMemoryGB} GB
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">CORS Allowed Origins</span>
                <span className="info-value" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {data.systemInfo.environment.allowedOrigins}
                </span>
              </div>
              <div style={{ marginTop: "12px", textAlign: "left" }}>
                <span className="info-label" style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Active Environment Variables Keys (Azure App Settings):
                </span>
                <div className="env-tags-container">
                  {data.systemInfo.environment.allConfiguredKeys.map((key) => (
                    <span key={key} className="env-tag">{key}</span>
                  ))}
                  {data.systemInfo.environment.allConfiguredKeys.length === 0 && (
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
              {revalidator.state === "loading" ? (
                <p>Next.js BFF ({data.apiUrl}) に接続中...</p>
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

        {/* 2. Interactive Roadmap Task Management */}
        <section className="panel">
          <div className="panel-title">
            <span>Azure Study Roadmap</span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {data.todos.filter(t => t.completed).length} / {data.todos.length} 完了
            </span>
          </div>

          {data.status === "online" ? (
            <>
              <div className="todo-container">
                {data.todos.map((todo) => (
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
                {data.todos.length === 0 && (
                  <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>タスクがありません</p>
                )}
              </div>

              {/* New Todo Form */}
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

      {/* Azure Deployment Guide */}
      <footer className="info-alert">
        <strong>💡 MSAL クライアント認証の特徴:</strong><br />
        1. <strong>セキュアなサインイン:</strong> フロントエンドに MSAL を導入することで、SWA無料プランのままでも特定の組織テナントのみにアクセス制限をかけることができます。<br />
        2. <strong>BFF CORS制限の注意:</strong> BFF コンテナと直接通信させる場合、BFF側の環境変数 <code>ALLOWED_ORIGINS</code> にこのアプリの公開ドメインを設定する必要があります。
      </footer>
    </>
  );
}
