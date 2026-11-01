const axios=require("axios")
const nodemailer=require("nodemailer")

const EMAIL_TIMEOUT_MS=15000

// Render's free plan blocks SMTP ports, so production sends over Brevo's HTTPS API.
// Local development can keep using Gmail SMTP.
const sendWithBrevo=(to,{subject,text,html})=>axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
        sender:{name:"SponsorWise",email:process.env.EMAIL_FROM},
        to:[{email:to}],
        subject,
        textContent:text,
        htmlContent:html
    },
    {
        timeout:EMAIL_TIMEOUT_MS,
        headers:{
            "api-key":process.env.BREVO_API_KEY,
            "Content-Type":"application/json"
        }
    }
)

const sendWithSmtp=async(to,{subject,text,html})=>{
    const transporter=nodemailer.createTransport({
        service:"gmail",
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASSWORD
        }
    })

    await transporter.sendMail({
        from:process.env.EMAIL_USER,
        to,
        subject,
        text,
        html
    });
}

// message comes from emailTemplates.js: {subject,text,html}
const sendEmail=async(to,message)=>{
    if(process.env.BREVO_API_KEY){
        await sendWithBrevo(to,message)
        return
    }
    await sendWithSmtp(to,message)
};

module.exports={sendEmail}
