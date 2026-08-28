package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;

public interface AccountOrderService {

    Page<OrderSummaryResponse> listMyOrders(String oauthSub, Pageable pageable);

    OrderDetailResponse getMyOrder(String oauthSub, String trackingNumber);
}
