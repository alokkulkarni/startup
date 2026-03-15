const FROM_DOMAIN = process.env.EMAIL_FROM_DOMAIN ?? 'forge.ai'
const FROM_ADDRESS = `Forge AI <no-reply@${FROM_DOMAIN}>`

function buildOtpHtml(name: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;text-align:center">
      <div style="width:56px;height:56px;background:#6366f1;border-radius:14px;margin:0 auto 12px;line-height:56px;font-size:28px;font-weight:700;color:#fff">F</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:600">Forge AI</h1>
    </div>
    <div style="padding:36px 40px">
      <h2 style="color:#111;margin:0 0 8px;font-size:20px">Verify your email</h2>
      <p style="color:#555;margin:0 0 28px;font-size:15px">Hi ${name}, enter this code to confirm your email address.</p>
      <div style="background:#f4f4f8;border:2px dashed #e0e0ee;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
        <span style="font-family:'Courier New',monospace;font-size:44px;font-weight:700;letter-spacing:14px;color:#1e1b4b">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;margin:0">This code expires in <strong>10 minutes</strong>.<br>If you didn't request this, ignore this email.</p>
    </div>
    <div style="padding:20px 40px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center">
      <p style="color:#bbb;font-size:12px;margin:0">© ${new Date().getFullYear()} Forge AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendOtpEmail(to: string, name: string, code: string): Promise<void> {
  const html = buildOtpHtml(name, code)
  const subject = `${code} — Your Forge AI verification code`

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Email send failed: ${JSON.stringify(err)}`)
    }
  } else {
    // Dev mode — print OTP to API console
    console.log('\n' + '═'.repeat(46))
    console.log('  📧  DEV EMAIL — OTP Verification')
    console.log('═'.repeat(46))
    console.log(`  To   : ${to}`)
    console.log(`  Code : ${code}`)
    console.log('═'.repeat(46) + '\n')
  }
}
