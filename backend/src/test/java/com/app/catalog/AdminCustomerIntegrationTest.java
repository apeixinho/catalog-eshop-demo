package com.app.catalog;

import static com.app.catalog.support.JwtTestSupport.adminJwt;
import static com.app.catalog.support.JwtTestSupport.catalogWriteJwt;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.entity.Product;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
import com.app.catalog.repository.CustomerRepository;
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

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class AdminCustomerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private Converter<Jwt, Collection<GrantedAuthority>> jwtGrantedAuthoritiesConverter;

    @MockitoBean
    private PaymentClient paymentClient;

    @BeforeEach
    void resetCatalog() {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        product.setActive(true);
        productRepository.saveAndFlush(product);
    }

    @Test
    void adminCannotCreateDuplicateEmail() throws Exception {
        String body = """
            {"firstName":"Dup","lastName":"Email","email":"dup-email@example.com","oauthSub":"sub-dup-1"}
            """;

        mockMvc.perform(post("/api/v1/admin/customers")
                .with(adminJwt(jwtGrantedAuthoritiesConverter, "admin-dup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/admin/customers")
                .with(adminJwt(jwtGrantedAuthoritiesConverter, "admin-dup"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("sub-dup-1", "sub-dup-2")))
            .andExpect(status().isConflict());
    }

    @Test
    void adminCannotCreateDuplicateOauthSub() throws Exception {
        mockMvc.perform(post("/api/v1/admin/customers")
                .with(adminJwt(jwtGrantedAuthoritiesConverter, "admin-oauth"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"One","lastName":"Sub","email":"oauth-a@example.com","oauthSub":"sub-shared"}
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/admin/customers")
                .with(adminJwt(jwtGrantedAuthoritiesConverter, "admin-oauth"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"Two","lastName":"Sub","email":"oauth-b@example.com","oauthSub":"sub-shared"}
                    """))
            .andExpect(status().isConflict());
    }

    @Test
    void adminCannotDeleteCustomerWithOrders() throws Exception {
        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-admin-delete-" + System.nanoTime(),
                "http://localhost:8091/checkout/sess-admin-delete"));

        mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(catalogWriteJwt(jwtGrantedAuthoritiesConverter, "shopper-with-order"))
                .header("Idempotency-Key", "admin-delete-key-" + System.nanoTime())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "customer":{"firstName":"Shop","lastName":"per","email":"shopper-order@example.com"},
                      "orderItems":[{"quantity":1,"productId":1}],
                      "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
                      "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
                      "currencyCode":"USD"
                    }
                    """))
            .andExpect(status().isOk());

        Long customerId = customerRepository.findByEmailIgnoreCase("shopper-order@example.com")
            .orElseThrow()
            .getId();

        mockMvc.perform(delete("/api/v1/admin/customers/" + customerId)
                .with(adminJwt(jwtGrantedAuthoritiesConverter, "admin-delete")))
            .andExpect(status().isConflict());

        assertThat(orderRepository.countByCustomerId(customerId)).isPositive();
    }
}
