package com.app.catalog.dto;

public record CustomerSummaryResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    long orderCount
) {}
