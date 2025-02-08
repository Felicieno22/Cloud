package com.remix.authAPI.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.remix.authAPI.dto.EmailVerificationRequest;
import com.remix.authAPI.entity.User;
import com.remix.authAPI.response.ResponseHandler;
import com.remix.authAPI.services.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
@Tag(name = "Inscription", description = "API d'inscription et de vérification d'email")
public class InscriptionController {

    private static final Logger logger = LoggerFactory.getLogger(InscriptionController.class);

    @Autowired
    private UserService userService;

    @Operation(summary = "Inscription d'un nouvel utilisateur", 
              description = "Permet de créer un nouveau compte utilisateur avec vérification par email")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Inscription réussie",
            content = @Content(schema = @Schema(implementation = User.class))),
        @ApiResponse(responseCode = "400", description = "Données invalides"),
        @ApiResponse(responseCode = "500", description = "Erreur serveur")
    })
    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody User user) {
        logger.info("Tentative d'inscription pour l'email : {}", user.getEmail());
        try {
            User savedUser = userService.registerUser(user);
            logger.info("Inscription réussie pour l'email : {}", user.getEmail());
            return new ResponseHandler().generateSuccessResponse(savedUser);
        } catch (RuntimeException e) {
            logger.error("Erreur lors de l'inscription pour l'email {} : {}", user.getEmail(), e.getMessage(), e);
            return new ResponseHandler().generateErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            logger.error("Erreur inattendue lors de l'inscription pour l'email {} : {}", user.getEmail(), e.getMessage(), e);
            return new ResponseHandler().generateErrorResponse("Erreur lors de l'inscription", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Operation(summary = "Vérification d'email", 
              description = "Vérifie l'email d'un utilisateur via un code envoyé par email")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Email vérifié avec succès"),
        @ApiResponse(responseCode = "400", description = "Code invalide ou expiré"),
        @ApiResponse(responseCode = "500", description = "Erreur serveur")
    })
    @PostMapping("/verify-email")
    public ResponseEntity<Object> verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        logger.info("Tentative de vérification d'email pour : {}", request.getEmail());
        try {
            userService.verifyEmail(request.getEmail(), request.getCode());
            logger.info("Email vérifié avec succès pour : {}", request.getEmail());
            return new ResponseHandler().generateSuccessResponse("Email vérifié avec succès");
        } catch (RuntimeException e) {
            logger.error("Erreur lors de la vérification d'email pour {} : {}", request.getEmail(), e.getMessage(), e);
            return new ResponseHandler().generateErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            logger.error("Erreur inattendue lors de la vérification d'email pour {} : {}", request.getEmail(), e.getMessage(), e);
            return new ResponseHandler().generateErrorResponse("Erreur lors de la vérification", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Object> test() {
        return new ResponseHandler().generateSuccessResponse("L'API fonctionne correctement");
    }
}