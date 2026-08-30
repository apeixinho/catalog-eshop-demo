package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static com.app.catalog.support.JwtTestSupport.managerJwt;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    private String paymentSessionId;

    @BeforeEach
    void placePendingOrder() throws Exception {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        product.setActive(true);
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

    @Test
    void managerCannotCancelPaidOrder() throws Exception {
        payOrder();

        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void managerCannotDeletePendingOrder() throws Exception {
        mockMvc.perform(delete("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isConflict());

        assertThat(orderRepository.findById(orderId)).isPresent();
    }

    @Test
    void deleteCancelledOrderAllowed() throws Exception {
        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isNoContent());

        assertThat(orderRepository.findById(orderId)).isEmpty();
    }

    @Test
    void managerCanGetOrderDetail() throws Exception {
        mockMvc.perform(get("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderTrackingNumber").value(trackingNumber))
            .andExpect(jsonPath("$.customer.email").value("manage-order@example.com"));
    }

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

        payOrder();

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

    @Test
    void deletePaidOrderFailsWhenProductInactive() throws Exception {
        payOrder();
        int stockAfterPayment = productRepository.findById(1L).orElseThrow().getUnitsInStock();

        Product product = productRepository.findById(1L).orElseThrow();
        product.setActive(false);
        productRepository.saveAndFlush(product);

        mockMvc.perform(delete("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isConflict());

        assertThat(orderRepository.findById(orderId)).isPresent();
        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockAfterPayment);
    }

    @Test
    void deletePaidMultiLineOrderRollsBackPartialStockRestore() throws Exception {
        Product product2 = productRepository.findById(2L).orElseThrow();
        product2.setUnitsInStock(100);
        product2.setActive(true);
        productRepository.saveAndFlush(product2);

        Long multiOrderId = placePaidMultiLineOrder();
        int stock1AfterPay = productRepository.findById(1L).orElseThrow().getUnitsInStock();
        int stock2AfterPay = productRepository.findById(2L).orElseThrow().getUnitsInStock();

        Product inactiveTarget = productRepository.findById(2L).orElseThrow();
        inactiveTarget.setActive(false);
        productRepository.saveAndFlush(inactiveTarget);

        mockMvc.perform(delete("/api/v1/manage/orders/" + multiOrderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1")))
            .andExpect(status().isConflict());

        assertThat(orderRepository.findById(multiOrderId)).isPresent();
        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stock1AfterPay);
        assertThat(productRepository.findById(2L).orElseThrow().getUnitsInStock())
            .isEqualTo(stock2AfterPay);
    }

    @Test
    void latePaymentWebhookRejectedAfterCancel() throws Exception {
        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt(jwtGrantedAuthoritiesConverter, "manager-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"%s","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(paymentSessionId, trackingNumber)))
            .andExpect(status().isConflict());

        assertThat(orderRepository.findById(orderId).orElseThrow().getStatus())
            .isEqualTo(OrderStatus.CANCELLED);
    }

    private void payOrder() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"%s","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(paymentSessionId, trackingNumber)))
            .andExpect(status().isOk());
    }

    private Long placePaidMultiLineOrder() throws Exception {
        String sessionId = "sess-multi-line-" + System.nanoTime();
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                sessionId, "http://localhost:8091/checkout/" + sessionId));

        String body = """
            {
              "customer":{"firstName":"Multi","lastName":"Line","email":"multi-line@example.com"},
              "orderItems":[{"quantity":2,"productId":1},{"quantity":1,"productId":2}],
              "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "currencyCode":"USD"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-multi-line"))
                .header("Idempotency-Key", "multi-line-key-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        String tracking = com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.orderTrackingNumber");
        String session = orderRepository.findByOrderTrackingNumber(tracking).orElseThrow().getPaymentSessionId();
        Long id = orderRepository.findByOrderTrackingNumber(tracking).orElseThrow().getId();

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"%s","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(session, tracking)))
            .andExpect(status().isOk());

        return id;
    }
}
