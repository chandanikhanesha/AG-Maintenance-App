const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text, html, attachments) => {
  let msg = {
    to: "devemailtest@mailinator.com",
    from: "dev@agridealer.co",
    subject: subject,
    text: text,
    ...(html && { html: html }),
    attachments: attachments ? attachments : [],
  };
  return sgMail.send(msg).then((result) => {
    console.log("email sent");
  });
};

module.exports = {
  sendEmail: sendEmail,
};
