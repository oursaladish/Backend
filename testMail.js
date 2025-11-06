require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.sendMail({
  from: `"Our Saladish" <${process.env.MAIL_USER}>`,
  to: "oursaladish@gmail.com",
  subject: "Test Email from Backend",
  text: "This confirms Gmail SMTP is working!",
})
.then(info => console.log("✅ Email sent:", info.response))
.catch(err => console.error("❌ Failed:", err));
