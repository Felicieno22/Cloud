const nodemailer = require('nodemailer');
require('dotenv').config();

// Créer le transporteur avec des options Gmail spécifiques
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Vérifier la configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log('Erreur de configuration email:', error);
    } else {
        console.log('Serveur email prêt à envoyer des messages');
    }
});

const sendEmail = async (to, subject, content) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: content
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email envoyé:', info.messageId);
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        throw error;
    }
};

module.exports = {
    sendEmail
};
