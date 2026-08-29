package com.app.catalog.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.dto.OrderSummaryResponse;
import com.app.catalog.dto.UpdateOrderRequest;
import com.app.catalog.services.ManageOrderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/manage/orders")
public class ManageOrderController {

    private final ManageOrderService manageOrderService;

    public ManageOrderController(ManageOrderService manageOrderService) {
        this.manageOrderService = manageOrderService;
    }

    @GetMapping
    public Page<OrderSummaryResponse> listOrders(@PageableDefault(size = 20) Pageable pageable) {
        return manageOrderService.listOrders(pageable);
    }

    @GetMapping("/{id}")
    public OrderDetailResponse getOrder(@PathVariable Long id) {
        return manageOrderService.getOrder(id);
    }

    @PutMapping("/{id}")
    public OrderDetailResponse updateOrder(
        @PathVariable Long id,
        @Valid @RequestBody UpdateOrderRequest request
    ) {
        return manageOrderService.updateOrder(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        manageOrderService.deleteOrder(id);
    }
}
