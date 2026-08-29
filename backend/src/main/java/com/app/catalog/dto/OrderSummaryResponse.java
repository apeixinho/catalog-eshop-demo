package com.app.catalog.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.app.catalog.entity.OrderStatus;

public record OrderSummaryResponse(
    Long id,
    String orderTrackingNumber,
    OrderStatus status,
    BigDecimal totalPrice,
    String currencyCode,
    int totalQuantity,
    Instant dateCreated
) {}
