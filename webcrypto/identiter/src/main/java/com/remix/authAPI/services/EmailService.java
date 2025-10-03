package com.remix.authAPI.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    public void sendRegistrationVerificationCode(String to, String code) {
        logger.info("Tentative d'envoi du code de vérification à : {}", to);
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            String htmlMsg = String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 20px; 
                        }
                        .code {
                            font-size: 24px;
                            font-weight: bold;
                            color: #4CAF50;
                            letter-spacing: 2px;
                            margin: 20px 0;
                            text-align: center;
                            padding: 10px;
                            background-color: #f5f5f5;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h1>Vérification de votre inscription</h1>
                        <p>Merci de vous être inscrit ! Pour activer votre compte, veuillez utiliser le code suivant :</p>
                        <p class='code'>%s</p>
                        <p>Ce code expirera dans 15 minutes.</p>
                        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
                    </div>
                </body>
                </html>
                """, code);

            logger.debug("Configuration de l'email...");
            helper.setTo(to);
            helper.setSubject("Code de vérification pour votre inscription");
            helper.setText(htmlMsg, true);
            
            logger.info("Envoi de l'email en cours...");
            mailSender.send(mimeMessage);
            logger.info("Email envoyé avec succès à : {}", to);
        } catch (MessagingException e) {
            logger.error("Erreur lors de l'envoi de l'email à {} : {}", to, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de l'envoi du code de vérification", e);
        }
    }

    public void send2FACode(String to, String code) {
        logger.info("Tentative d'envoi du code 2FA à : {}", to);
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            String htmlMsg = String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 20px; 
                        }
                        .code {
                            font-size: 24px;
                            font-weight: bold;
                            color: #4CAF50;
                            letter-spacing: 2px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h1>Code de vérification</h1>
                        <p>Voici votre code de vérification à 6 chiffres :</p>
                        <p class='code'>%s</p>
                        <p>Ce code expirera dans 5 minutes.</p>
                        <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
                    </div>
                </body>
                </html>
                """, code);

            logger.debug("Configuration de l'email...");
            helper.setTo(to);
            helper.setSubject("Code de vérification pour votre connexion");
            helper.setText(htmlMsg, true);
            
            logger.info("Envoi de l'email en cours...");
            mailSender.send(mimeMessage);
            logger.info("Email envoyé avec succès à : {}", to);
        } catch (MessagingException e) {
            logger.error("Erreur lors de l'envoi de l'email à {} : {}", to, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de l'envoi du code 2FA", e);
        }
    }

    public void sendUnlockEmail(String to, String unlockLink) {
        logger.info("Tentative d'envoi de l'email de déverrouillage à : {}", to);
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            String htmlMsg = String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 20px; 
                        }
                        .button {
                            background-color: #4CAF50;
                            color: white !important;
                            padding: 12px 20px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h1>Déverrouillage de votre compte</h1>
                        <p>Votre compte a été temporairement verrouillé suite à plusieurs tentatives de connexion échouées.</p>
                        <p>Pour déverrouiller votre compte, cliquez sur le bouton ci-dessous :</p>
                        <p><a class='button' href='%s'>Déverrouiller mon compte</a></p>
                    </div>
                </body>
                </html>
                """, unlockLink);

            logger.debug("Configuration de l'email...");
            helper.setTo(to);
            helper.setSubject("Déverrouillage de votre compte");
            helper.setText(htmlMsg, true);
            
            logger.info("Envoi de l'email en cours...");
            mailSender.send(mimeMessage);
            logger.info("Email envoyé avec succès à : {}", to);
        } catch (MessagingException e) {
            logger.error("Erreur lors de l'envoi de l'email à {} : {}", to, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de l'envoi de l'email de déverrouillage", e);
        }
    }
}