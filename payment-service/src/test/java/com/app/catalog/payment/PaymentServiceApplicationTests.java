package com.app.catalog.payment;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.catalog.payment.model.PaymentSession;
import com.app.catalog.payment.service.CatalogWebhookClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CatalogWebhookClient webhookClient;

    @Test
    void createSessionRequiresSecret() throws Exception {
        mockMvc.perform(post("/api/v1/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "amount": 10.00,
                      "currency": "EUR",
                      "orderTrackingNumber": "t-1",
                      "successUrl": "http://localhost:4200/checkout/result",
                      "cancelUrl": "http://localhost:4200/checkout/result"
                    }
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void createSessionPayAndCancelHappyPaths() throws Exception {
        when(webhookClient.notify(any(), eq(PaymentSession.Status.SUCCEEDED))).thenReturn(null);
        when(webhookClient.notify(any(), eq(PaymentSession.Status.CANCELLED))).thenReturn(null);

        MvcResult created = mockMvc.perform(post("/api/v1/sessions")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "amount": 10.00,
                      "currency": "EUR",
                      "orderTrackingNumber": "t-2",
                      "successUrl": "http://localhost:4200/checkout/result",
                      "cancelUrl": "http://localhost:4200/checkout/result"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionId").isNotEmpty())
            .andExpect(jsonPath("$.checkoutUrl").isNotEmpty())
            .andReturn();

        JsonNode body = objectMapper.readTree(created.getResponse().getContentAsString());
        String sessionId = body.get("sessionId").asString();

        mockMvc.perform(get("/checkout/" + sessionId))
            .andExpect(status().isOk());

        mockMvc.perform(post("/checkout/" + sessionId + "/pay"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("tracking=t-2")))
            .andExpect(header().string("Location", org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("status="))));

        MvcResult createdCancel = mockMvc.perform(post("/api/v1/sessions")
                .header("X-Payment-Secret", "dev-payment-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "amount": 5.00,
                      "currency": "USD",
                      "orderTrackingNumber": "t-3",
                      "successUrl": "http://localhost:4200/checkout/result",
                      "cancelUrl": "http://localhost:4200/checkout/result"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();

        String cancelSessionId = objectMapper.readTree(createdCancel.getResponse().getContentAsString())
            .get("sessionId").asString();

        mockMvc.perform(post("/checkout/" + cancelSessionId + "/cancel"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("tracking=t-3")))
            .andExpect(header().string("Location", org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("status="))));
    }
}
