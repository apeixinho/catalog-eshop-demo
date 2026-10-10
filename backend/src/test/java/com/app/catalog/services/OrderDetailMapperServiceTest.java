package com.app.catalog.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.time.Instant;

import com.app.catalog.dto.OrderDetailResponse;
import com.app.catalog.entity.Customer;
import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.entity.OrderStatus;
import com.app.catalog.entity.Product;
import com.app.catalog.entity.ProductCategory;
import com.app.catalog.entity.ProductCategoryTranslation;
import com.app.catalog.entity.ProductTranslation;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderDetailMapperServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private OrderDetailMapperService service;

    @Test
    void toDetailIncludesCustomerOrderCountAndProductFields() {
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

        ProductCategory category = new ProductCategory();
        category.setId(1L);
        ProductCategoryTranslation categoryTr = new ProductCategoryTranslation();
        categoryTr.setLocale("en");
        categoryTr.setName("Books");
        category.addTranslation(categoryTr);

        Product product = new Product();
        product.setId(1L);
        product.setCategory(category);
        ProductTranslation productTr = new ProductTranslation();
        productTr.setLocale("en");
        productTr.setName("Crash Course in Python");
        productTr.setDescription("Learn Python");
        product.addTranslation(productTr);

        when(orderRepository.countByCustomerId(7L)).thenReturn(3L);
        when(productRepository.findAllById(anyCollection())).thenReturn(List.of(product));

        OrderDetailResponse detail = service.toDetail(order, "en");

        assertThat(detail.customer().orderCount()).isEqualTo(3L);
        assertThat(detail.orderTrackingNumber()).isEqualTo("TRK-99");
        assertThat(detail.items()).hasSize(1);
        assertThat(detail.items().get(0).productId()).isEqualTo(1L);
        assertThat(detail.items().get(0).productName()).isEqualTo("Crash Course in Python");
        assertThat(detail.items().get(0).categoryName()).isEqualTo("Books");
    }

    @Test
    void toDetailUsesEmptyNamesWhenProductMissing() {
        Customer customer = new Customer();
        customer.setId(7L);
        customer.setFirstName("Ada");
        customer.setLastName("Lovelace");
        customer.setEmail("ada@example.com");
        customer.setOauthSub("sub-ada");

        OrderItem line = new OrderItem();
        line.setProductId(999L);
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

        when(orderRepository.countByCustomerId(7L)).thenReturn(1L);
        when(productRepository.findAllById(anyCollection())).thenReturn(List.of());

        OrderDetailResponse detail = service.toDetail(order);

        assertThat(detail.items().get(0).productName()).isEmpty();
        assertThat(detail.items().get(0).categoryName()).isEmpty();
    }
}
