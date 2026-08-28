package com.app.catalog.controller;

import com.app.catalog.dto.OrderStatusResponse;
import com.app.catalog.dto.Purchase;
import com.app.catalog.dto.PurchaseResponse;
import com.app.catalog.services.CheckoutService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
public class CheckoutController {

    private final String API_PATH = "/api/v1";
    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping(API_PATH + "/checkout/purchase")
    public PurchaseResponse placeOrder(
        @Valid @RequestBody Purchase purchase,
        @AuthenticationPrincipal Jwt jwt,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {

        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }
        return checkoutService.placeOrder(purchase, jwt.getSubject(), idempotencyKey);
    }

    @GetMapping(API_PATH + "/checkout/orders/{trackingNumber}")
    public OrderStatusResponse getOrderStatus(
        @PathVariable("trackingNumber") String trackingNumber,
        @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }
        return checkoutService.getOrderStatus(trackingNumber, jwt.getSubject());
    }
}
