const axios=require("axios")
const nodemailer=require("nodemailer")

const EMAIL_TIMEOUT_MS=15000

// Render's free plan blocks SMTP ports, so production sends over Brevo's HTTPS API.
// Local development can keep using Gmail SMTP.
const sendWithBrevo=(to,subject,text)=>axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
        sender:{name:"SponsorWise",email:process.env.EMAIL_FROM},
        to:[{email:to}],
        subject,
        textContent:text
    },
    {
        timeout:EMAIL_TIMEOUT_MS,
        headers:{
            "api-key":process.env.BREVO_API_KEY,
            "Content-Type":"application/json"
        }
    }
)

const sendWithSmtp=async(to,subject,text)=>{
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
        text
    });
}

const sendEmail=async(to,subject,text)=>{
    if(process.env.BREVO_API_KEY){
        await sendWithBrevo(to,subject,text)
        return
    }
    await sendWithSmtp(to,subject,text)
};

module.exports={sendEmail}
