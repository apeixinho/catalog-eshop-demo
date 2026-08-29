package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderStatus;
import com.app.catalog.entity.Product;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class CheckoutPaymentIntegrationTest {

    private static final String PURCHASE_BODY = """
        {
          "customer":{"firstName":"Ada","lastName":"Lovelace","email":"%s"},
          "orderItems":[{"quantity":1,"productId":1}],
          "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
          "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
          "currencyCode":"USD"
        }
        """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @MockitoBean
    private PaymentClient paymentClient;

    @Autowired
    private Converter<Jwt, Collection<GrantedAuthority>> jwtGrantedAuthoritiesConverter;

    @BeforeEach
    void restoreStock() {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        productRepository.saveAndFlush(product);
    }

    @Test
    void placeOrderDoesNotDecrementStockAndWebhookSuccessDoes() throws Exception {
        Product before = productRepository.findById(1L).orElseThrow();
        int stockBefore = before.getUnitsInStock();

        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-pay-ok", "http://localhost:8091/checkout/sess-pay-ok"));

        MvcResult placed = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-pay-ok"))
                .header("Idempotency-Key", "pay-ok-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY.formatted("ada-pay@example.com")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.paymentUrl").value("http://localhost:8091/checkout/sess-pay-ok"))
            .andReturn();

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore);

        JsonNode body = objectMapper.readTree(placed.getResponse().getContentAsString());
        String tracking = body.get("orderTrackingNumber").asText();

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"sess-pay-ok","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(tracking)))
            .andExpect(status().isOk());

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore - 1);
        Order paid = orderRepository.findByOrderTrackingNumber(tracking).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"sess-pay-ok","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(tracking)))
            .andExpect(status().isOk());

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore - 1);
    }

    @Test
    void webhookCancelMarksOrderCancelledWithoutStockChange() throws Exception {
        Product before = productRepository.findById(1L).orElseThrow();
        int stockBefore = before.getUnitsInStock();

        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-pay-cancel", "http://localhost:8091/checkout/sess-pay-cancel"));

        MvcResult placed = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-pay-cancel"))
                .header("Idempotency-Key", "pay-cancel-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY.formatted("ada-cancel@example.com")))
            .andExpect(status().isOk())
            .andReturn();

        String tracking = objectMapper.readTree(placed.getResponse().getContentAsString())
            .get("orderTrackingNumber").asText();

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"sess-pay-cancel","status":"CANCELLED","orderTrackingNumber":"%s"}
                    """.formatted(tracking)))
            .andExpect(status().isOk());

        assertThat(productRepository.findById(1L).orElseThrow().getUnitsInStock())
            .isEqualTo(stockBefore);
        assertThat(orderRepository.findByOrderTrackingNumber(tracking).orElseThrow().getStatus())
            .isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void webhookSuccessWithInsufficientStockReturns409AndCancels() throws Exception {
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-pay-stock", "http://localhost:8091/checkout/sess-pay-stock"));

        MvcResult placed = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-pay-stock"))
                .header("Idempotency-Key", "pay-stock-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY.formatted("ada-stock@example.com")))
            .andExpect(status().isOk())
            .andReturn();

        String tracking = objectMapper.readTree(placed.getResponse().getContentAsString())
            .get("orderTrackingNumber").asText();

        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(0);
        productRepository.saveAndFlush(product);

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"sess-pay-stock","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(tracking)))
            .andExpect(status().isConflict());

        assertThat(orderRepository.findByOrderTrackingNumber(tracking).orElseThrow().getStatus())
            .isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void orderStatusRequiresAuthAndReturnsOwnerStatus() throws Exception {
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-status", "http://localhost:8091/checkout/sess-status"));

        MvcResult placed = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-status"))
                .header("Idempotency-Key", "status-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY.formatted("status@example.com")))
            .andExpect(status().isOk())
            .andReturn();

        String tracking = objectMapper.readTree(placed.getResponse().getContentAsString())
            .get("orderTrackingNumber").asText();

        mockMvc.perform(get("/api/v1/checkout/orders/{tracking}", tracking))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/checkout/orders/{tracking}", tracking)
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "other-user")))
            .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/checkout/orders/{tracking}", tracking)
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-status")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"sess-status","status":"SUCCEEDED","orderTrackingNumber":"%s"}
                    """.formatted(tracking)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/checkout/orders/{tracking}", tracking)
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-status")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PAID"));
    }
}
