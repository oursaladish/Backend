import axios from "axios";

export const sendBrevoEmail = async (to, subject, html) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Our Saladish",
          email: process.env.BREVO_SENDER_EMAIL || "our.saladish@gmail.com",
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Brevo Email Sent:", response.data);
  } catch (error) {
    console.error("❌ Brevo Email Error:", error.response?.data || error.message);
  }
};
