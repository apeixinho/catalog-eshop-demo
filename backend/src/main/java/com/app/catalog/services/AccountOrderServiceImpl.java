package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.entity.Order;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.OrderRepository;

@Service
public class AccountOrderServiceImpl implements AccountOrderService {

    private final OrderRepository orderRepository;

    public AccountOrderServiceImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> listMyOrders(String oauthSub, Pageable pageable) {
        requireOauthSub(oauthSub);
        return orderRepository.findByCustomer_OauthSubOrderByDateCreatedDesc(oauthSub.trim(), pageable)
            .map(OrderMapper::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDetailResponse getMyOrder(String oauthSub, String trackingNumber) {
        requireOauthSub(oauthSub);
        if (trackingNumber == null || trackingNumber.isBlank()) {
            throw new IllegalArgumentException("Order tracking number is required");
        }
        Order order = orderRepository.findByOrderTrackingNumber(trackingNumber.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));
        if (order.getCustomer() == null || !oauthSub.equals(order.getCustomer().getOauthSub())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order");
        }
        long orderCount = orderRepository.countByCustomerId(order.getCustomer().getId());
        return OrderMapper.toDetail(order, orderCount);
    }

    private static void requireOauthSub(String oauthSub) {
        if (oauthSub == null || oauthSub.isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }
    }
}
