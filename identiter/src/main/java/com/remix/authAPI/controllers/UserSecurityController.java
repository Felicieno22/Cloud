package com.remix.authAPI.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.remix.authAPI.entity.UserSecurity;
import com.remix.authAPI.response.ResponseHandler;
import com.remix.authAPI.services.UserSecurityService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/user-security")
@Tag(name = "User Security", description = "Gestion des informations de sécurité des utilisateurs")
public class UserSecurityController extends ResponseHandler {

    private final UserSecurityService userSecurityService;

    public UserSecurityController(UserSecurityService userSecurityService) {
        this.userSecurityService = userSecurityService;
    }

    @Operation(summary = "Détails de la sécurité d'un utilisateur", 
              description = "Récupère les détails de sécurité d'un utilisateur par son ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Détails de sécurité trouvés"),
        @ApiResponse(responseCode = "404", description = "Détails de sécurité non trouvés")
    })
    @GetMapping("/{userId}")
    public ResponseEntity<Object> getUserSecurityByUserId(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId
    ) {
        return userSecurityService.findByUserId(userId)
                .map(this::generateSuccessResponse)
                .orElse(generateErrorResponse("Détails de sécurité non trouvés", HttpStatus.NOT_FOUND));
    }

    @Operation(summary = "Mise à jour des informations de sécurité", 
              description = "Met à jour les informations de sécurité d'un utilisateur existant")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Informations de sécurité mises à jour avec succès"),
        @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PutMapping("/{userId}")
    public ResponseEntity<Object> updateUserSecurity(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId,
        @RequestBody UserSecurity userSecurity
    ) {
        return userSecurityService.findByUserId(userId)
                .map(existingUserSecurity -> {
                    userSecurity.setId(existingUserSecurity.getId());
                    UserSecurity updatedUserSecurity = userSecurityService.updateUserSecurity(userSecurity);
                    return generateSuccessResponse(updatedUserSecurity);
                })
                .orElse(generateErrorResponse("Utilisateur non trouvé", HttpStatus.NOT_FOUND));
    }

    @Operation(summary = "Incrémenter les tentatives de connexion échouées", 
              description = "Incrémente le nombre de tentatives de connexion échouées pour un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tentatives de connexion échouées incrémentées avec succès"),
        @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PostMapping("/increment-failed-login-attempts/{userId}")
    public ResponseEntity<Object> incrementFailedLoginAttempts(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId
    ) {
        try {
            userSecurityService.incrementFailedLoginAttempts(userId);
            return generateSuccessResponse("Tentatives de connexion échouées incrémentées avec succès");
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Réinitialiser les tentatives de connexion échouées", 
              description = "Réinitialise le nombre de tentatives de connexion échouées pour un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tentatives de connexion échouées réinitialisées avec succès"),
        @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PostMapping("/reset-failed-login-attempts/{userId}")
    public ResponseEntity<Object> resetFailedLoginAttempts(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId
    ) {
        try {
            userSecurityService.resetFailedLoginAttempts(userId);
            return generateSuccessResponse("Tentatives de connexion échouées réinitialisées avec succès");
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Verrouiller le compte utilisateur", 
              description = "Verrouille le compte d'un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Compte utilisateur verrouillé avec succès"),
        @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PostMapping("/lock-account/{userId}")
    public ResponseEntity<Object> lockAccount(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId
    ) {
        try {
            userSecurityService.lockAccount(userId);
            return generateSuccessResponse("Compte utilisateur verrouillé avec succès");
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Déverrouiller le compte utilisateur", 
              description = "Déverrouille le compte d'un utilisateur")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Compte utilisateur déverrouillé avec succès"),
        @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PostMapping("/unlock-account/{userId}")
    public ResponseEntity<Object> unlockAccount(
        @Parameter(description = "ID de l'utilisateur") 
        @PathVariable Long userId
    ) {
        try {
            userSecurityService.unlockAccount(userId);
            return generateSuccessResponse("Compte utilisateur déverrouillé avec succès");
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
}