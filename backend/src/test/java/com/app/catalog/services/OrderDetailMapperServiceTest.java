package com.app.catalog.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Date;
import java.time.Instant;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.entity.Customer;
import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.entity.OrderStatus;
import com.app.catalog.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderDetailMapperServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderDetailMapperService service;

    @Test
    void toDetailIncludesCustomerOrderCount() {
        Customer customer = new Customer();
        customer.setId(7L);
        customer.setFirstName("Ada");
        customer.setLastName("Lovelace");
        customer.setEmail("ada@example.com");
        customer.setOauthSub("sub-ada");

        OrderItem line = new OrderItem();
        line.setProductId(1L);
        line.setQuantity(1);
        line.setUnitPrice(BigDecimal.TEN);
        line.setImageUrl("/img.png");

        Order order = new Order();
        order.setId(99L);
        order.setOrderTrackingNumber("TRK-99");
        order.setStatus(OrderStatus.PAID);
        order.setTotalPrice(BigDecimal.TEN);
        order.setCurrencyCode("USD");
        order.setTotalQuantity(1);
        order.setDateCreated(Date.from(Instant.parse("2026-08-30T00:00:00Z")));
        order.setLastUpdated(Date.from(Instant.parse("2026-08-30T00:00:00Z")));
        order.setCustomer(customer);
        order.add(line);

        when(orderRepository.countByCustomerId(7L)).thenReturn(3L);

        OrderDetailResponse detail = service.toDetail(order);

        assertThat(detail.customer().orderCount()).isEqualTo(3L);
        assertThat(detail.orderTrackingNumber()).isEqualTo("TRK-99");
    }
}
