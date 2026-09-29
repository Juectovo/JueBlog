import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * JueBlog 邮件服务 —— 三级投递策略（保证邮箱通用性）
 *
 * 1. SMTP（推荐）：配置 SMTP_HOST/SMTP_USER/SMTP_PASS 后，用 QQ/163 等
 *    邮箱的授权码发信 → 可送达任意邮箱（网易/QQ/Gmail…），无域名要求
 * 2. Resend：配置 RESEND_API_KEY 后使用；注意其测试模式（未验证域名）
 *    只能发送给 Resend 账号注册邮箱
 * 3. 开发模式（都没配置）：不发送，把链接打印到终端，本地全流程可测
 *
 * 三类邮件：登录魔法链接 / 注册邮箱验证 / 密码重置，主题均以 "JueBlog" 开头
 */

export type MailMode = "smtp" | "resend" | "console";

/** 当前邮件投递模式（注册接口据此决定是否把验证链接返回给前端） */
export function getMailMode(): MailMode {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return "console";
}

let smtpTransporter: Transporter | null = null;

function getSmtp(): Transporter | null {
  if (getMailMode() !== "smtp") return null;
  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** SMTP 模式的发件人 = 授权码邮箱本身；Resend 模式用配置的发件人 */
const SMTP_FROM = process.env.SMTP_USER
  ? `JueBlog <${process.env.SMTP_USER}>`
  : (process.env.EMAIL_FROM ?? "JueBlog <onboarding@resend.dev>");

/** 把底层发送错误翻译成可操作的中文提示 */
function explainError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("only send testing emails")) {
    return new Error(
      "Resend 测试模式限制：只能发送给你注册 Resend 的邮箱。请改用 SMTP 发信（配置 SMTP_HOST/SMTP_USER/SMTP_PASS，用 QQ/163 邮箱授权码即可发送给任意邮箱），或在 Resend 验证你的域名。"
    );
  }
  if (raw.toLowerCase().includes("authentication") || raw.includes("535")) {
    return new Error("SMTP 认证失败：请确认使用的是邮箱「授权码」而不是登录密码");
  }
  return new Error(raw);
}

/** 统一发送入口：发送失败必须抛出，让调用方感知 */
async function deliver(options: { to: string; subject: string; html: string }) {
  const mode = getMailMode();

  if (mode === "smtp") {
    const transporter = getSmtp()!;
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (err) {
      throw explainError(err);
    }
    return;
  }

  if (mode === "resend" && resend) {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "JueBlog <onboarding@resend.dev>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    if (error) throw explainError(new Error(error.message));
    return;
  }

  // 开发模式：仅打印
  console.info(`[mail] 邮件服务未配置（SMTP / RESEND_API_KEY 均为空），跳过发送：${options.subject} → ${options.to}`);
}

/** 黑色极简邮件模板（行内样式，兼容各邮件客户端） */
function emailShell(options: {
  heading: string;
  body: string;
  actionLabel: string;
  url: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#0A0A0A;">
    <div style="padding:48px 16px;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#141414;border:1px solid #262626;border-radius:12px;">
        <tr><td style="padding:40px 32px;">
          <div style="color:#EDEDED;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Jue<span style="color:#8A8A8A;">Blog</span></div>
          <h1 style="color:#EDEDED;font-size:18px;font-weight:600;margin:24px 0 8px;">${options.heading}</h1>
          <p style="color:#8A8A8A;font-size:14px;line-height:1.7;margin:0 0 24px;">${options.body}</p>
          <a href="${options.url}" style="display:inline-block;background-color:#EDEDED;color:#0A0A0A;font-size:14px;font-weight:500;padding:10px 24px;border-radius:8px;text-decoration:none;">${options.actionLabel}</a>
          <p style="color:#8A8A8A;font-size:12px;line-height:1.6;margin:28px 0 0;">若按钮无法点击，请复制以下链接到浏览器打开：<br /><span style="color:#B3B3B3;word-break:break-all;">${options.url}</span></p>
          <p style="color:#5A5A5A;font-size:12px;margin:16px 0 0;">如果你没有发起过此操作，可以忽略本邮件。</p>
        </td></tr>
      </table>
      <p style="color:#5A5A5A;font-size:12px;text-align:center;margin:24px 0 0;">© JueBlog · Write. Connect. Belong.</p>
    </div>
  </body>
</html>`;
}

/** 登录魔法链接（NextAuth Email Provider 调用） */
export async function sendMagicLinkEmail(to: string, url: string) {
  if (!resend && !getSmtp()) {
    console.info(`[mail] 🔗 开发模式魔法链接（直接在浏览器打开即可登录）：\n${url}`);
    return;
  }
  await deliver({
    to,
    subject: "JueBlog · 你的登录链接",
    html: emailShell({
      heading: "登录 JueBlog",
      body: "点击下面的按钮即可登录，链接 1 小时内有效。",
      actionLabel: "登录 JueBlog",
      url,
    }),
  });
}

/** 注册后的邮箱验证链接 */
export async function sendVerificationEmail(to: string, url: string) {
  if (!resend && !getSmtp()) {
    console.info(`[mail] ✉️ 开发模式邮箱验证链接：\n${url}`);
    return;
  }
  await deliver({
    to,
    subject: "JueBlog · 请验证你的邮箱",
    html: emailShell({
      heading: "验证你的邮箱",
      body: "感谢注册 JueBlog！点击下面的按钮完成邮箱验证，链接 24 小时内有效。",
      actionLabel: "验证邮箱",
      url,
    }),
  });
}

/** 忘记密码的重置链接 */
export async function sendPasswordResetEmail(to: string, url: string) {
  if (!resend && !getSmtp()) {
    console.info(`[mail] 🔑 开发模式密码重置链接：\n${url}`);
    return;
  }
  await deliver({
    to,
    subject: "JueBlog · 重置你的密码",
    html: emailShell({
      heading: "重置你的密码",
      body: "点击下面的按钮设置新密码，链接 1 小时内有效。",
      actionLabel: "重置密码",
      url,
    }),
  });
}
