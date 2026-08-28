package com.app.catalog.dto;

import java.util.List;

public record CustomerDetailResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String oauthSub,
    List<OrderSummaryResponse> orders
) {}
