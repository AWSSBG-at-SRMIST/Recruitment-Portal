import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#050208;font-family:'Space Grotesk',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="height:4px;background:linear-gradient(90deg,#A855F7,#D946EF);"></div>
    <div style="background:#120d1e;border:2px solid #2a2236;border-top:none;padding:32px 32px 28px;">
      <div style="padding-bottom:20px;margin-bottom:28px;border-bottom:1px solid #2a2236;">
        <span style="color:#A855F7;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">
          AWS SBG at SRMIST Recruitment
        </span><br>
        <span style="color:#A1A1AA;font-size:11px;letter-spacing:1px;">
          AWS Student Builder Group &middot; SRM Institute of Science and Technology
        </span>
      </div>
      ${body}
    </div>
    <div style="background:#0a0613;border:2px solid #1c1426;border-top:none;padding:10px 20px;text-align:center;">
      <span style="color:#A1A1AA;font-size:10px;letter-spacing:2px;text-transform:uppercase;">
        Automated Message &middot; Do Not Reply
      </span>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOTPEmail(email: string, otp: string, name = "there") {
  // Demo/dev fallback: with no Gmail app password configured, print the OTP to
  // the server console instead of sending mail so the login flow is testable
  // locally without email credentials.
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`\n[DEV OTP] ${email} → ${otp}  (${name})\n`);
    return;
  }

  const body = `
    <p style="color:#A1A1AA;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">
      Authentication Request
    </p>
    <p style="color:#f4f2f8;font-size:15px;font-weight:bold;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">
      Hello, ${escHtml(name)}.
    </p>
    <p style="color:#f4f2f8;font-size:13px;margin:0 0 28px;">
      Your one-time sign-in code for the AWS SBG at SRMIST Recruitment:
    </p>
    <div style="background:#0a0613;border:2px solid #A855F7;padding:28px;text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;font-weight:bold;letter-spacing:14px;color:#D946EF;">${escHtml(otp)}</span>
    </div>
    <p style="color:#A1A1AA;font-size:11px;margin:0;border-top:1px solid #2a2236;padding-top:16px;">
      This code expires in 5 minutes. If you did not request this, ignore this email —
      do not share this OTP with anyone.
    </p>`;

  await transporter.sendMail({
    from: `"AWS SBG at SRMIST Recruitment" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `[${otp}] Your sign-in OTP — AWS SBG at SRMIST Recruitment`,
    html: shell("Sign-In OTP", body),
  });
}
