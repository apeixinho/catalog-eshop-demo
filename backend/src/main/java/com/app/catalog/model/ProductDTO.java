package com.app.catalog.model;

import java.math.BigDecimal;
import java.util.Date;

public record ProductDTO(
    Long id,
    String sku,
    String name,
    String description,
    BigDecimal unitPrice,
    String imageUrl,
    boolean active,
    int unitsInStock,
    Date dateCreated,
    Date lastUpdated,
    ProductCategoryDTO category
) {
}
