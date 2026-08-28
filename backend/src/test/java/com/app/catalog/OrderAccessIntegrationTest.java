package com.app.catalog;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class OrderAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @MockitoBean
    private PaymentClient paymentClient;

    private String trackingNumber;

    @BeforeEach
    void placeOrderForUser() throws Exception {
        Product product = productRepository.findById(1L).orElseThrow();
        product.setUnitsInStock(100);
        productRepository.saveAndFlush(product);

        when(paymentClient.createSession(any()))
            .thenReturn(new CreatePaymentSessionResponse(
                "sess-order-access", "http://localhost:8091/checkout/sess-order-access"));

        String body = """
            {
              "customer":{"firstName":"Ada","lastName":"Lovelace","email":"ada-order-access@example.com"},
              "orderItems":[{"quantity":1,"productId":1}],
              "shippingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "billingAddress":{"street":"1 St","city":"Lisbon","stateId":224,"countryCode":"PT","zipCode":"1000"},
              "currencyCode":"USD"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/checkout/purchase")
                .with(jwt().jwt(j -> j.subject("user-order-access").claim("scope", "catalog.write"))
                    .authorities(() -> "SCOPE_catalog.write"))
                .header("Idempotency-Key", "order-access-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn();

        trackingNumber = com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.orderTrackingNumber");
    }

    @Test
    void accountOrdersRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/account/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void userCanListOwnOrders() throws Exception {
        mockMvc.perform(get("/api/v1/account/orders")
                .with(jwt().jwt(j -> j.subject("user-order-access").claim("scope", "catalog.write"))
                    .authorities(() -> "SCOPE_catalog.write")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].orderTrackingNumber").value(trackingNumber));
    }

    @Test
    void userCannotAccessManageOrders() throws Exception {
        mockMvc.perform(get("/api/v1/manage/orders")
                .with(jwt().jwt(j -> j.subject("user-order-access").claim("scope", "catalog.write"))
                    .authorities(() -> "SCOPE_catalog.write")))
            .andExpect(status().isForbidden());
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor managerJwt() {
        return jwt().jwt(j -> j.subject("manager-1").claim("scope", "catalog.write"))
            .authorities(
                new SimpleGrantedAuthority("SCOPE_catalog.write"),
                new SimpleGrantedAuthority("ROLE_MANAGER"));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor adminJwt() {
        return jwt().jwt(j -> j.subject("admin-1").claim("scope", "catalog.write"))
            .authorities(
                new SimpleGrantedAuthority("SCOPE_catalog.write"),
                new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void managerCanListOrdersAndCustomers() throws Exception {
        mockMvc.perform(get("/api/v1/manage/orders").with(managerJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].orderTrackingNumber").value(trackingNumber));

        mockMvc.perform(get("/api/v1/manage/customers").with(managerJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[?(@.email=='ada-order-access@example.com')]").exists());
    }

    @Test
    void managerCannotAccessAdminCustomers() throws Exception {
        mockMvc.perform(post("/api/v1/admin/customers")
                .with(managerJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"M","lastName":"X","email":"mx@example.com","oauthSub":"sub-mx"}
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void managerCanUpdateAndDeleteOrders() throws Exception {
        Long orderId = orderRepository.findByOrderTrackingNumber(trackingNumber).orElseThrow().getId();

        mockMvc.perform(put("/api/v1/manage/orders/" + orderId)
                .with(managerJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(delete("/api/v1/manage/orders/" + orderId).with(managerJwt()))
            .andExpect(status().isOk());
    }

    @Test
    void adminCanManageCustomers() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/admin/customers")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"Admin","lastName":"Created","email":"admin-created@example.com","oauthSub":"sub-admin-created"}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        Number id = com.jayway.jsonpath.JsonPath.read(
            created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/v1/admin/customers/" + id)
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"Admin","lastName":"Updated","email":"admin-updated@example.com","oauthSub":"sub-admin-created"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("admin-updated@example.com"));

        mockMvc.perform(delete("/api/v1/admin/customers/" + id).with(adminJwt()))
            .andExpect(status().isNoContent());
    }
}
