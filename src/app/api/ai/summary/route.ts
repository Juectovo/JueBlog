import { fail, ok, requireAuth, serverError, unauthorized, zodFail } from "@/lib/api/response";
import { z } from "zod";

const bodySchema = z.object({
  content: z.string().min(20, "正文太短，无法生成摘要").max(20_000),
});

/**
 * POST /api/ai/summary —— AI 生成文章摘要（需登录）
 * 请求体：{ content }；返回 { summary }，由编辑器填入摘要栏（不自动保存）
 *
 * 环境变量（.env.local）：
 * - AI_API_KEY   必填（OpenAI 兼容接口的 Key）
 * - AI_BASE_URL  可选，默认 https://api.openai.com/v1（可指向智谱/DeepSeek 等兼容端点）
 * - AI_MODEL     可选，默认 gpt-4o-mini
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return fail("AI_NOT_CONFIGURED", "站点未配置 AI 服务（需要 AI_API_KEY 环境变量）", 400);
    }

    const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.AI_MODEL ?? "gpt-4o-mini";

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "你是 JueBlog 的编辑助手。为博客文章写一段 60 字以内的中文摘要，客观概括核心内容，语气克制，不要使用感叹号和 emoji，直接输出摘要正文。",
          },
          {
            role: "user",
            content: parsed.data.content.slice(0, 6000),
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[ai-summary]", res.status, detail.slice(0, 300));
      return fail("AI_ERROR", `AI 服务返回错误（HTTP ${res.status}）`, 502);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return fail("AI_ERROR", "AI 未返回有效摘要", 502);

    return ok({ summary });
  } catch (err) {
    return serverError(err, "POST /api/ai/summary");
  }
}
