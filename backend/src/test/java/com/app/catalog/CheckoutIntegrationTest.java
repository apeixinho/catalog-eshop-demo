package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.entity.Product;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;
import java.util.Collection;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class CheckoutIntegrationTest {

    private static final String PURCHASE_BODY = """
        {
          "customer":{"firstName":"Checkout","lastName":"Tester","email":"checkout-test@example.com"},
          "orderItems":[{"quantity":1,"productId":1}],
          "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
          "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
          "currencyCode":"USD"
        }
        """;

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

    @BeforeEach
    void restoreProduct() {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        product.setActive(true);
        productRepository.saveAndFlush(product);
    }

    @Test
    void idempotencyKeyReturnsExistingOrderWithoutDuplicate() throws Exception {
        String key = "idem-key-" + System.nanoTime();
        String email = "idem-" + System.nanoTime() + "@example.com";
        String body = PURCHASE_BODY.replace("checkout-test@example.com", email);

        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-idem", "http://localhost:8091/checkout/sess-idem"));

        MvcResult first = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-idem"))
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        String tracking = com.jayway.jsonpath.JsonPath.read(
            first.getResponse().getContentAsString(), "$.orderTrackingNumber");

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-idem"))
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderTrackingNumber").value(tracking));

        assertThat(orderRepository.findByOrderTrackingNumber(tracking)).isPresent();
        assertThat(orderRepository.findAll().stream()
            .filter(o -> key.equals(o.getIdempotencyKey()))
            .count()).isEqualTo(1);
    }

    @Test
    void checkoutRejectsMissingIdempotencyKey() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-no-key"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY))
            .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutRejectsInsufficientStock() throws Exception {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(0);
        productRepository.saveAndFlush(product);

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-no-stock"))
                .header("Idempotency-Key", "no-stock-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY))
            .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutRejectsInactiveProduct() throws Exception {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setActive(false);
        productRepository.saveAndFlush(product);

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-inactive"))
                .header("Idempotency-Key", "inactive-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content(PURCHASE_BODY))
            .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutRejectsUnknownProduct() throws Exception {
        String body = PURCHASE_BODY.replace("\"productId\":1", "\"productId\":99999");

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-unknown-product"))
                .header("Idempotency-Key", "unknown-product-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
