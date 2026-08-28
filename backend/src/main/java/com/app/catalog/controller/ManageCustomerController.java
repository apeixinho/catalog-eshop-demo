package com.app.catalog.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.catalog.dto.CustomerDetailResponse;
import com.app.catalog.dto.CustomerSummaryResponse;
import com.app.catalog.services.CustomerManagementService;

@RestController
@RequestMapping("/api/v1/manage/customers")
public class ManageCustomerController {

    private final CustomerManagementService customerManagementService;

    public ManageCustomerController(CustomerManagementService customerManagementService) {
        this.customerManagementService = customerManagementService;
    }

    @GetMapping
    public Page<CustomerSummaryResponse> listCustomers(@PageableDefault(size = 20) Pageable pageable) {
        return customerManagementService.listCustomers(pageable);
    }

    @GetMapping("/{id}")
    public CustomerDetailResponse getCustomer(@PathVariable Long id) {
        return customerManagementService.getCustomer(id);
    }
}
