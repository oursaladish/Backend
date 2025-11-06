// utils/sendEmail.js
const SibApiV3Sdk = require('sib-api-v3-sdk');
const client = SibApiV3Sdk.ApiClient.instance;

const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendConfirmationEmail = async (userEmail, userName, confirmationLink) => {
  const emailData = {
    sender: {
      name: "Our Saladish",
      email: "noreply@oursaladish.shop" // ✅ Verified sender
    },
    to: [{ email: userEmail }],
    subject: "Confirm your email",
    htmlContent: `<p>Hi ${userName}, click <a href="${confirmationLink}">here</a> to confirm your email.</p>`
  };

  return emailApi.sendTransacEmail(emailData);
};

module.exports = sendConfirmationEmail;