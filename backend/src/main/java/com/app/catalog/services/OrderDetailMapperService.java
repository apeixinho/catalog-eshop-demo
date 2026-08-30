package com.app.catalog.services;

import org.springframework.stereotype.Service;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.entity.Order;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.OrderRepository;

@Service
public class OrderDetailMapperService {

    private final OrderRepository orderRepository;

    public OrderDetailMapperService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public OrderDetailResponse toDetail(Order order) {
        long orderCount = orderRepository.countByCustomerId(order.getCustomer().getId());
        return OrderMapper.toDetail(order, orderCount);
    }
}
