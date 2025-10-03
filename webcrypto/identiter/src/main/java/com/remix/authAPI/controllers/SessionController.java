package com.remix.authAPI.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.remix.authAPI.response.ResponseHandler;
import com.remix.authAPI.services.SessionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/sessions")
@Tag(name = "Sessions", description = "Gestion des sessions utilisateur")
public class SessionController extends ResponseHandler {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Operation(summary = "Validation d'une session", 
              description = "Vérifie si une session est valide et la prolonge si c'est le cas")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Session valide"),
        @ApiResponse(responseCode = "401", description = "Session invalide ou expirée")
    })
    @PostMapping("/validate")
    public ResponseEntity<Object> validateSession(
        @Parameter(description = "Token de session", required = true)
        @RequestHeader("Session-Token") String token
    ) {
        try {
            boolean isValid = sessionService.validateAndUpdateSession(token);
            return generateSuccessResponse(isValid);
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.UNAUTHORIZED);
        }
    }

    @Operation(summary = "Déconnexion", 
              description = "Invalide la session courante")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Déconnexion réussie"),
        @ApiResponse(responseCode = "401", description = "Session déjà invalide")
    })
    @PostMapping("/logout")
    public ResponseEntity<Object> logout(
        @Parameter(description = "Token de session", required = true)
        @RequestHeader("Session-Token") String token
    ) {
        try {
            sessionService.invalidateSession(token);
            return generateSuccessResponse("Déconnexion réussie");
        } catch (RuntimeException e) {
            return generateErrorResponse(e.getMessage(), HttpStatus.UNAUTHORIZED);
        }
    }
}