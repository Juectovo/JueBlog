/**
 * 轻量 API 客户端（Client Components 用）
 * 自动解包统一信封：成功返回 data，失败抛 ApiError（带 code/message）
 */

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.error?.code ?? "UNKNOWN",
      json?.error?.message ?? "请求失败，请稍后重试",
      res.status
    );
  }

  return json.data as T;
}
