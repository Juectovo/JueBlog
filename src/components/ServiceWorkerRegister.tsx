"use client";

import { useEffect } from "react";

/** 注册 Service Worker（PWA 离线 + 可安装） */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // 仅生产环境启用
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
