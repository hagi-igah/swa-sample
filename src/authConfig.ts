import type { Configuration, PopupRequest } from "@azure/msal-browser";

/**
 * Microsoft Authentication Library (MSAL) の設定定義
 */
export const msalConfig: Configuration = {
  auth: {
    // Azure ポータルの「アプリの登録」で取得した値をここに設定します
    clientId: "12307cf4-79de-40ba-a0f6-d101ae4ca40f",
    authority: "https://login.microsoftonline.com/d65b7ca2-322a-40f0-a392-0d6c69968dcc",

    // MSAL v5 の popup/iframe 応答を受ける専用ブリッジページ
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/redirect.html` : "/redirect.html",
    postLogoutRedirectUri: typeof window !== "undefined" ? window.location.origin : "/",
  },
  cache: {
    cacheLocation: "sessionStorage", // トークンの保存先 (セッション終了時にクリア)
  }
};

/**
 * ログイン要求時に取得する権限 (スコープ)
 */
export const loginRequest: PopupRequest = {
  scopes: ["User.Read"] // サインインしたユーザーのプロファイル読み取り権限
};
