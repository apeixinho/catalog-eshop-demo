package com.app.catalog.mapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.app.catalog.dto.CustomerSummaryResponse;
import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderItemResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.entity.Customer;
import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.entity.Product;
import com.app.catalog.i18n.TranslationResolver;

public final class OrderMapper {

    private OrderMapper() {
    }

    public static OrderSummaryResponse toSummary(Order order) {
        return new OrderSummaryResponse(
            order.getId(),
            order.getOrderTrackingNumber(),
            order.getStatus(),
            order.getTotalPrice(),
            order.getCurrencyCode(),
            order.getTotalQuantity(),
            toInstant(order.getDateCreated())
        );
    }

    public static OrderDetailResponse toDetail(
        Order order,
        long customerOrderCount,
        Map<Long, Product> productsById,
        String lang
    ) {
        Customer customer = order.getCustomer();
        CustomerSummaryResponse customerSummary = toCustomerSummary(customer, customerOrderCount);
        List<OrderItemResponse> items = order.getOrderItems().stream()
            .map(item -> toItem(item, productsById.get(item.getProductId()), lang))
            .toList();
        return new OrderDetailResponse(
            order.getId(),
            order.getOrderTrackingNumber(),
            order.getStatus(),
            order.getTotalPrice(),
            order.getCurrencyCode(),
            order.getTotalQuantity(),
            toInstant(order.getDateCreated()),
            toInstant(order.getLastUpdated()),
            order.getPaymentUrl(),
            customerSummary,
            items
        );
    }

    public static CustomerSummaryResponse toCustomerSummary(Customer customer, long orderCount) {
        return new CustomerSummaryResponse(
            customer.getId(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getEmail(),
            orderCount
        );
    }

    private static OrderItemResponse toItem(OrderItem item, Product product, String lang) {
        String productName = "";
        String categoryName = "";
        if (product != null) {
            productName = TranslationResolver.productName(product, lang);
            if (product.getCategory() != null) {
                categoryName = TranslationResolver.categoryName(product.getCategory(), lang);
            }
        }
        return new OrderItemResponse(
            item.getProductId(),
            productName,
            categoryName,
            item.getImageUrl(),
            item.getUnitPrice(),
            item.getQuantity()
        );
    }

    private static Instant toInstant(java.util.Date date) {
        return date != null ? date.toInstant() : null;
    }
}
