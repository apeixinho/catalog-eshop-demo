package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.dto.UpdateOrderRequest;

public interface ManageOrderService {

    Page<OrderSummaryResponse> listOrders(Pageable pageable);

    OrderDetailResponse getOrder(Long id);

    OrderDetailResponse updateOrder(Long id, UpdateOrderRequest request);

    void deleteOrder(Long id);
}
