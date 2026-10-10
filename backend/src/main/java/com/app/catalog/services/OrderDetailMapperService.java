package com.app.catalog.services;

import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.entity.Product;
import com.app.catalog.i18n.SupportedLocale;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;

@Service
public class OrderDetailMapperService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderDetailMapperService(
        OrderRepository orderRepository,
        ProductRepository productRepository
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    public OrderDetailResponse toDetail(Order order) {
        return toDetail(order, SupportedLocale.DEFAULT);
    }

    public OrderDetailResponse toDetail(Order order, String lang) {
        String locale = SupportedLocale.normalize(lang);
        long orderCount = orderRepository.countByCustomerId(order.getCustomer().getId());
        Set<Long> productIds = order.getOrderItems().stream()
            .map(OrderItem::getProductId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        Map<Long, Product> productsById = productRepository.findAllById(productIds).stream()
            .collect(Collectors.toMap(Product::getId, Function.identity()));
        return OrderMapper.toDetail(order, orderCount, productsById, locale);
    }
}
