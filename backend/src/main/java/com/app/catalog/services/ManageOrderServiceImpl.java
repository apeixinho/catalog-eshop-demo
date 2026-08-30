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
import com.app.catalog.entity.OrderStatus;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.OrderRepository;

@Service
public class ManageOrderServiceImpl implements ManageOrderService {

    private final OrderRepository orderRepository;
    private final OrderStockService orderStockService;

    public ManageOrderServiceImpl(OrderRepository orderRepository, OrderStockService orderStockService) {
        this.orderRepository = orderRepository;
        this.orderStockService = orderStockService;
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
        return toDetail(order);
    }

    @Override
    @Transactional
    public OrderDetailResponse updateOrder(Long id, UpdateOrderRequest request) {
        Order order = findOrder(id);
        OrderStatus current = order.getStatus();
        OrderStatus next = request.status();

        if (current == next) {
            return toDetail(order);
        }
        if (current != OrderStatus.PENDING || next != OrderStatus.CANCELLED) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Only pending orders can be cancelled manually; paid status requires payment");
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order saved = orderRepository.save(order);
        return toDetail(saved);
    }

    @Override
    @Transactional
    public void deleteOrder(Long id) {
        Order order = findOrder(id);
        if (order.getStatus() == OrderStatus.PENDING) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Pending orders awaiting payment cannot be deleted; cancel first");
        }
        if (order.getStatus() == OrderStatus.PAID) {
            orderStockService.restoreStockForOrder(order);
        }
        orderRepository.delete(order);
    }

    private OrderDetailResponse toDetail(Order order) {
        long orderCount = orderRepository.countByCustomerId(order.getCustomer().getId());
        return OrderMapper.toDetail(order, orderCount);
    }

    private Order findOrder(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Order id is required");
        }
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));
    }
}
