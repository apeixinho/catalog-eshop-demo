package com.app.catalog.services;

import com.app.catalog.dto.OrderStatusResponse;
import com.app.catalog.dto.PaymentWebhookRequest;
import com.app.catalog.dto.Purchase;
import com.app.catalog.dto.PurchaseResponse;

public interface CheckoutService {

    PurchaseResponse placeOrder(Purchase purchase, String oauthSub, String idempotencyKey);

    OrderStatusResponse getOrderStatus(String orderTrackingNumber, String oauthSub);

    void finalizePayment(PaymentWebhookRequest request);
}
