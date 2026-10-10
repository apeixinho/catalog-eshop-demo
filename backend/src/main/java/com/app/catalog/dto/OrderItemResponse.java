package com.app.catalog.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
    Long productId,
    String productName,
    String categoryName,
    String imageUrl,
    BigDecimal unitPrice,
    int quantity
) {}
