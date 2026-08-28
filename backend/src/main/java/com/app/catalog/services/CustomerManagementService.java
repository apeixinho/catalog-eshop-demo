package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.app.catalog.dto.CustomerDetailResponse;
import com.app.catalog.dto.CustomerSummaryResponse;
import com.app.catalog.dto.CustomerUpsertRequest;

public interface CustomerManagementService {

    Page<CustomerSummaryResponse> listCustomers(Pageable pageable);

    CustomerDetailResponse getCustomer(Long id);

    CustomerSummaryResponse createCustomer(CustomerUpsertRequest request);

    CustomerSummaryResponse updateCustomer(Long id, CustomerUpsertRequest request);

    void deleteCustomer(Long id);
}
