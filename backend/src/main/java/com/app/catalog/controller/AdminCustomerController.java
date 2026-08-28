package com.app.catalog.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.app.catalog.dto.CustomerSummaryResponse;
import com.app.catalog.dto.CustomerUpsertRequest;
import com.app.catalog.services.CustomerManagementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/customers")
public class AdminCustomerController {

    private final CustomerManagementService customerManagementService;

    public AdminCustomerController(CustomerManagementService customerManagementService) {
        this.customerManagementService = customerManagementService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerSummaryResponse createCustomer(@Valid @RequestBody CustomerUpsertRequest request) {
        return customerManagementService.createCustomer(request);
    }

    @PutMapping("/{id}")
    public CustomerSummaryResponse updateCustomer(
        @PathVariable Long id,
        @Valid @RequestBody CustomerUpsertRequest request
    ) {
        return customerManagementService.updateCustomer(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCustomer(@PathVariable Long id) {
        customerManagementService.deleteCustomer(id);
    }
}
