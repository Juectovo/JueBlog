import { Resend } from "resend";

/**
 * JueBlog 邮件服务（Resend）
 * - 三类邮件：登录魔法链接 / 注册邮箱验证 / 密码重置
 * - 主题均以 "JueBlog" 开头，便于用户识别
 * - 开发模式（未配置 RESEND_API_KEY）：不发送，把链接打印到终端，本地全流程可测
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "JueBlog <noreply@jueblog.com>";

/** 统一发送入口：发送失败必须抛出，让调用方感知 */
async function send(options: { to: string; subject: string; html: string }) {
  if (!resend) {
    // 开发模式：仅打印主题，链接由各流程单独打印
    console.info(`[mail] RESEND_API_KEY 未配置，跳过发送：${options.subject} → ${options.to}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(`邮件发送失败：${error.message}`);
  }
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
  if (!resend) {
    console.info(`[mail] 🔗 开发模式魔法链接（直接在浏览器打开即可登录）：\n${url}`);
    return;
  }

  await send({
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
  if (!resend) {
    console.info(`[mail] ✉️ 开发模式邮箱验证链接：\n${url}`);
    return;
  }

  await send({
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
  if (!resend) {
    console.info(`[mail] 🔑 开发模式密码重置链接：\n${url}`);
    return;
  }

  await send({
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
