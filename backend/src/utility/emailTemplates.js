const OTP_MINUTES=5

const OTP_COPY={
    verify:{heading:"Verify your email",intro:"Enter this code to finish setting up your SponsorWise account."},
    reset:{heading:"Reset your password",intro:"Enter this code to choose a new password."},
    newEmail:{heading:"Confirm your new email",intro:"Enter this code to move your SponsorWise account to this address."}
}

const FONT="'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

// Titles and previews can hold what other users typed, so nothing goes in raw
const escapeHtml=(value="")=>String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;")

// Email apps ignore most modern CSS, so this stays as tables and inline styles.
// The logo is styled text, which still shows when an inbox blocks images.
const layout=({preheader,heading,intro,content,note})=>{
    const site=process.env.CLIENT_ORIGIN
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3EEE5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3EEE5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;border-radius:16px;overflow:hidden;background-color:#FFFFFF;">
<tr><td style="background-color:#0F4C4F;padding:22px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="34" height="34" align="center" style="width:34px;height:34px;border-radius:10px;background-color:#F2A31B;font-family:${FONT};font-size:20px;font-weight:800;color:#0F4C4F;">S</td>
<td style="padding-left:10px;font-family:${FONT};font-size:20px;font-weight:700;color:#FFFFFF;">Sponsor<span style="color:#F2A31B;">Wise</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:32px;font-family:${FONT};">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:700;color:#132B2C;">${heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#465B5C;">${intro}</p>
${content}
${note?`<p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#667978;">${note}</p>`:""}
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #E7E1D6;background-color:#FBF8F3;font-family:${FONT};font-size:12px;line-height:1.6;color:#667978;">
SponsorWise · Event sponsorship, made clear<br>
<a href="${site}/privacy" style="color:#667978;">Privacy</a> · <a href="${site}/terms" style="color:#667978;">Terms</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const otpEmail=(otp,purpose="verify")=>{
    const {heading,intro}=OTP_COPY[purpose]
    const expiry=`This code expires in ${OTP_MINUTES} minutes.`
    const warning="If you didn't ask for it, you can ignore this email. Never share this code with anyone."

    return {
        // A different subject each time stops inboxes folding new codes under old ones
        subject:`${otp} is your SponsorWise code`,
        text:`${heading}\n\n${intro}\n\nYour code: ${otp}\n\n${expiry}\n${warning}`,
        html:layout({
            preheader:`${otp} is your code. ${expiry}`,
            heading,
            intro,
            content:`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="padding:20px 8px;border-radius:12px;background-color:#E3F0EE;">
<div style="font-family:Consolas,Menlo,monospace;font-size:34px;line-height:1.2;font-weight:700;letter-spacing:8px;color:#0F4C4F;">${otp}</div>
<div style="margin-top:6px;font-family:${FONT};font-size:13px;color:#465B5C;">${expiry}</div>
</td></tr></table>`,
            note:warning
        })
    }
}

const alertEmail=({title,body,link=""})=>{
    const url=`${process.env.CLIENT_ORIGIN}${link}`
    const safeTitle=escapeHtml(title)
    const safeBody=escapeHtml(body)

    return {
        subject:title,
        text:`${title}\n\n${body?`${body}\n\n`:""}Open SponsorWise: ${url}\n\nYou can turn these emails off in Settings.`,
        html:layout({
            preheader:safeBody||safeTitle,
            heading:safeTitle,
            intro:safeBody||"Open SponsorWise to see what's new.",
            content:`<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="border-radius:10px;background-color:#0F4C4F;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Open SponsorWise</a>
</td></tr></table>`,
            note:`You're getting this because you were away from SponsorWise. <a href="${process.env.CLIENT_ORIGIN}/settings" style="color:#667978;">Turn these emails off</a>`
        })
    }
}

module.exports={otpEmail,alertEmail}
