package com.app.catalog.dto;

import com.app.catalog.entity.OrderStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateOrderRequest(
    @NotNull OrderStatus status
) {}
