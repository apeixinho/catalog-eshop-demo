package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static com.app.catalog.support.JwtTestSupport.managerJwt;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.entity.OrderStatus;
import com.app.catalog.entity.Product;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class ManageOrderIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private Converter<Jwt, Collection<GrantedAuthority>> jwtGrantedAuthoritiesConverter;

    @MockitoBean
    private PaymentClient paymentClient;

    private String trackingNumber;
    private Long orderId;

    @BeforeEach
    void placePendingOrder() throws Exception {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        productRepository.saveAndFlush(product);

        String sessionId = "sess-manage-order-" + System.nanoTime();
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                sessionId, "http://localhost:8091/checkout/" + sessionId));

        String body = """
            {
              "customer":{"firstName":"Manage","lastName":"Tester","email":"manage-order@example.com"},
              "orderItems":[{"quantity":2,"productId":1}],
              "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "currencyCode":"USD"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-manage-order"))
                .header("Idempotency-Key", "manage-order-key-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        trackingNumber = com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.orderTrackingNumber");
        orderId = orderRepository.findByOrderTrackingNumber(trackingNumber).orElseThrow().getId();
        paymentSessionId = orderRepository.findById(orderId).orElseThrow().getPaymentSessionId();
    }

    private String paymentSessionId;

    @Test
    void managerCanCancelPendingOrder() throws Exception {
        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void managerCannotMarkOrderPaidManually() throws Exception {
        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PAID\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void deletePaidOrderRestoresStock() throws Exception {
        int stockBefore = productRepository.findById(1L).orElseThrow().getUnitsInStock();

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"%s","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(paymentSessionId, trackingNumber)))
            .andExpect(status().isOk());

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore - 2);
        assertThat(orderRepository.findById(orderId).orElseThrow().getStatus())
            .isEqualTo(OrderStatus.PAID);

        mockMvc.perform(delete("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isNoContent());

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore);
        assertThat(orderRepository.findById(orderId)).isEmpty();
    }
}
