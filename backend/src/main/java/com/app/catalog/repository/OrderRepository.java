package com.app.catalog.repository;

import com.app.catalog.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderTrackingNumber(String orderTrackingNumber);

    Optional<Order> findByCustomerIdAndIdempotencyKey(Long customerId, String idempotencyKey);

    Optional<Order> findByPaymentSessionId(String paymentSessionId);

    Page<Order> findByCustomer_OauthSubOrderByDateCreatedDesc(String oauthSub, Pageable pageable);

    Page<Order> findAllByOrderByDateCreatedDesc(Pageable pageable);

    List<Order> findByCustomerIdOrderByDateCreatedDesc(Long customerId);

    long countByCustomerId(Long customerId);
}
