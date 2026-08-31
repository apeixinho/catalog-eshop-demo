package com.app.catalog.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.catalog.dto.CustomerDetailResponse;
import com.app.catalog.dto.CustomerSummaryResponse;
import com.app.catalog.dto.CustomerUpsertRequest;
import com.app.catalog.entity.Customer;
import com.app.catalog.mapper.OrderMapper;
import com.app.catalog.repository.CustomerRepository;
import com.app.catalog.repository.OrderRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CustomerManagementServiceImpl implements CustomerManagementService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    public CustomerManagementServiceImpl(
        CustomerRepository customerRepository,
        OrderRepository orderRepository
    ) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerSummaryResponse> listCustomers(Pageable pageable) {
        var page = customerRepository.findAll(pageable);
        Map<Long, Long> orderCounts = orderCountsByCustomerId(page.getContent());
        return page.map(customer -> OrderMapper.toCustomerSummary(
            customer, orderCounts.getOrDefault(customer.getId(), 0L)));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDetailResponse getCustomer(Long id) {
        Customer customer = findCustomer(id);
        return toDetail(customer);
    }

    @Override
    @Transactional
    public CustomerSummaryResponse createCustomer(CustomerUpsertRequest request) {
        customerRepository.findByEmailIgnoreCase(request.email().trim())
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            });
        customerRepository.findByOauthSub(request.oauthSub().trim())
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "OAuth subject already registered");
            });

        Customer customer = new Customer();
        applyRequest(customer, request);
        Customer saved = customerRepository.save(customer);
        return OrderMapper.toCustomerSummary(saved, orderRepository.countByCustomerId(saved.getId()));
    }

    @Override
    @Transactional
    public CustomerSummaryResponse updateCustomer(Long id, CustomerUpsertRequest request) {
        Customer customer = findCustomer(id);
        customerRepository.findByEmailIgnoreCase(request.email().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            });
        customerRepository.findByOauthSub(request.oauthSub().trim())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "OAuth subject already registered");
            });
        applyRequest(customer, request);
        Customer saved = customerRepository.save(customer);
        return OrderMapper.toCustomerSummary(saved, orderRepository.countByCustomerId(saved.getId()));
    }

    @Override
    @Transactional
    public void deleteCustomer(Long id) {
        Customer customer = findCustomer(id);
        if (orderRepository.countByCustomerId(customer.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer has orders");
        }
        customerRepository.delete(customer);
    }

    private Customer findCustomer(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Customer id is required");
        }
        return customerRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown customer"));
    }

    private CustomerDetailResponse toDetail(Customer customer) {
        var orders = orderRepository.findByCustomerIdOrderByDateCreatedDesc(customer.getId()).stream()
            .map(OrderMapper::toSummary)
            .toList();
        return new CustomerDetailResponse(
            customer.getId(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getEmail(),
            customer.getOauthSub(),
            orders
        );
    }

    private static void applyRequest(Customer customer, CustomerUpsertRequest request) {
        customer.setFirstName(request.firstName().trim());
        customer.setLastName(request.lastName().trim());
        customer.setEmail(request.email().trim());
        customer.setOauthSub(request.oauthSub().trim());
    }

    @SuppressWarnings("null")
    private Map<Long, Long> orderCountsByCustomerId(List<Customer> customers) {
        if (customers.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = customers.stream().map(Customer::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : orderRepository.countOrdersGroupedByCustomerId(ids)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }
}
