package com.remix.authAPI.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.remix.authAPI.response.ResponseHandler;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/test")
@Tag(name = "Test", description = "API de test pour vérifier le fonctionnement")
public class TestController {

    @Operation(summary = "Test de l'API", description = "Vérifie si l'API fonctionne correctement")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "L'API fonctionne correctement")
    })
    @GetMapping("/")
    public ResponseEntity<Object> test() {
        return new ResponseHandler().generateSuccessResponse("L'API fonctionne correctement");
    }
}