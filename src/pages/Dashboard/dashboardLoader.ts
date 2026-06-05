import type { LoaderFunctionArgs } from "react-router";

export interface SystemInfo {
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

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface DashboardLoaderData {
  status: "online" | "offline";
  systemInfo: SystemInfo | null;
  todos: Todo[];
  apiUrl: string;
}

export async function dashboardLoader({ request }: LoaderFunctionArgs): Promise<DashboardLoaderData> {
  const url = new URL(request.url);
  const defaultApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const apiUrl = url.searchParams.get("apiUrl") || defaultApiUrl;

  try {
    // Fetch both API endpoints concurrently
    const [infoRes, todosRes] = await Promise.all([
      fetch(`${apiUrl}/api/info`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      fetch(`${apiUrl}/api/todos`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    ]);

    if (!infoRes.ok || !todosRes.ok) {
      throw new Error("API endpoints returned error status");
    }

    const systemInfo: SystemInfo = await infoRes.json();
    const todos: Todo[] = await todosRes.json();

    return {
      status: "online",
      systemInfo,
      todos,
      apiUrl,
    };
  } catch (error) {
    console.error("Dashboard loader error fetching BFF:", error);
    return {
      status: "offline",
      systemInfo: null,
      todos: [],
      apiUrl,
    };
  }
}
