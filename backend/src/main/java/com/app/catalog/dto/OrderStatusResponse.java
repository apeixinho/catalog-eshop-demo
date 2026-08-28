package com.app.catalog.dto;

import com.app.catalog.entity.OrderStatus;

public record OrderStatusResponse(
    String orderTrackingNumber,
    OrderStatus status
) {}
