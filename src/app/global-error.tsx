"use client";

/**
 * 全局错误兜底：root layout 自身渲染失败时的最后防线
 * （global-error.tsx 必须自带 <html>/<body>）
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          color: "#EDEDED",
          fontFamily:
            "-apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px" }}>
          <p style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 8px" }}>
            应用遇到了意外错误
          </p>
          <p style={{ fontSize: "14px", color: "#8A8A8A", margin: "0 0 24px" }}>
            请刷新页面重试；若持续出现，请稍后再访问。
          </p>
          <button
            onClick={reset}
            style={{
              background: "#EDEDED",
              color: "#0A0A0A",
              border: "none",
              borderRadius: "8px",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
