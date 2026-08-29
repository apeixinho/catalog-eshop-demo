package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.dto.UpdateOrderRequest;
import com.app.catalog.entity.Order;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.OrderRepository;

@Service
public class ManageOrderServiceImpl implements ManageOrderService {

    private final OrderRepository orderRepository;

    public ManageOrderServiceImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> listOrders(Pageable pageable) {
        return orderRepository.findAllByOrderByDateCreatedDesc(pageable)
            .map(OrderMapper::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDetailResponse getOrder(Long id) {
        Order order = findOrder(id);
        return OrderMapper.toDetail(order);
    }

    @Override
    @Transactional
    public OrderDetailResponse updateOrder(Long id, UpdateOrderRequest request) {
        Order order = findOrder(id);
        order.setStatus(request.status());
        Order saved = orderRepository.save(order);
        return OrderMapper.toDetail(saved);
    }

    @Override
    @Transactional
    public void deleteOrder(Long id) {
        Order order = findOrder(id);
        orderRepository.delete(order);
    }

    private Order findOrder(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Order id is required");
        }
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));
    }
}
