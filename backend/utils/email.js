const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // TRANSPORTER

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // EMAIL OPTIONS

    const mailOptions = {
        from: options.from,
        to: options.email,
        subject: options.subject,
        text: `Go to ${options.url} to reset your password`,
    };

    // SENDING THE MAIL

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
