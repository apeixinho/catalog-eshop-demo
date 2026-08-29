package com.app.catalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.app.catalog.entity.OrderStatus;

public record OrderDetailResponse(
    Long id,
    String orderTrackingNumber,
    OrderStatus status,
    BigDecimal totalPrice,
    String currencyCode,
    int totalQuantity,
    Instant dateCreated,
    Instant lastUpdated,
    String paymentUrl,
    CustomerSummaryResponse customer,
    List<OrderItemResponse> items
) {}
