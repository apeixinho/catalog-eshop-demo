package com.app.catalog.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.services.AccountOrderService;

@RestController
@RequestMapping("/api/v1/account/orders")
public class AccountOrderController {

    private final AccountOrderService accountOrderService;

    public AccountOrderController(AccountOrderService accountOrderService) {
        this.accountOrderService = accountOrderService;
    }

    @GetMapping
    public Page<OrderSummaryResponse> listMyOrders(
        @AuthenticationPrincipal Jwt jwt,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return accountOrderService.listMyOrders(requireSubject(jwt), pageable);
    }

    @GetMapping("/{trackingNumber}")
    public OrderDetailResponse getMyOrder(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String trackingNumber
    ) {
        return accountOrderService.getMyOrder(requireSubject(jwt), trackingNumber);
    }

    private static String requireSubject(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }
        return jwt.getSubject();
    }
}
