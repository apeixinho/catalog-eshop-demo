package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.entity.Product;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
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

import java.util.Collection;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class SecurityAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @MockitoBean
    private PaymentClient paymentClient;

    @Autowired
    private Converter<Jwt, Collection<GrantedAuthority>> jwtGrantedAuthoritiesConverter;

    @BeforeEach
    void restoreStock() {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        product.setActive(true);
        productRepository.saveAndFlush(product);
    }

    @Test
    void catalogIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("page", "0").param("size", "5"))
            .andExpect(status().isOk());
    }

    @Test
    void checkoutRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/purchase")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void checkoutInvalidBodyReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-1"))
                .header("Idempotency-Key", "test-key-invalid-body")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutAcceptedWithWriteScope() throws Exception {
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-1", "http://localhost:8091/checkout/sess-1"));

        String body = """
            {
              "customer":{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com"},
              "orderItems":[{"quantity":1,"productId":1}],
              "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "currencyCode":"USD"
            }
            """;

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "user-ada"))
                .header("Idempotency-Key", "test-key-checkout-ok")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderTrackingNumber").isNotEmpty())
            .andExpect(jsonPath("$.paymentUrl").value("http://localhost:8091/checkout/sess-1"));
    }

    @Test
    void paymentWebhookRequiresSecret() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/payment-webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"sessionId":"x","status":"SUCCEEDED","orderTrackingNumber":"y"}
                    """))
            .andExpect(status().isUnauthorized());
    }
}
