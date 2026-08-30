package com.app.catalog.services;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import com.app.catalog.currency.CurrencyRates;
import com.app.catalog.dto.AddressRequest;
import com.app.catalog.dto.CustomerRequest;
import com.app.catalog.dto.OrderItemRequest;
import com.app.catalog.dto.OrderStatusResponse;
import com.app.catalog.dto.PaymentWebhookRequest;
import com.app.catalog.dto.Purchase;
import com.app.catalog.dto.PurchaseResponse;
import com.app.catalog.entity.Address;
import com.app.catalog.entity.Customer;
import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.entity.OrderStatus;
import com.app.catalog.entity.Product;
import com.app.catalog.entity.State;
import com.app.catalog.i18n.SupportedLocale;
import com.app.catalog.i18n.TranslationResolver;
import com.app.catalog.payment.CreatePaymentSessionRequest;
import com.app.catalog.payment.CreatePaymentSessionResponse;
import com.app.catalog.payment.PaymentClient;
import com.app.catalog.repository.CustomerRepository;
import com.app.catalog.repository.OrderRepository;
import com.app.catalog.repository.ProductRepository;
import com.app.catalog.repository.StateRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CheckoutServiceImpl implements CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutServiceImpl.class);

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StateRepository stateRepository;
    private final PaymentClient paymentClient;
    private final OrderPaymentCancelService orderPaymentCancelService;
    private final String checkoutResultUrl;

    public CheckoutServiceImpl(
        CustomerRepository customerRepository,
        OrderRepository orderRepository,
        ProductRepository productRepository,
        StateRepository stateRepository,
        PaymentClient paymentClient,
        OrderPaymentCancelService orderPaymentCancelService,
        @Value("${catalog.payment.checkout-result-url:http://localhost:4200/checkout/result}")
        String checkoutResultUrl) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.stateRepository = stateRepository;
        this.paymentClient = paymentClient;
        this.orderPaymentCancelService = orderPaymentCancelService;
        this.checkoutResultUrl = checkoutResultUrl;
    }

    @Override
    @Transactional
    public PurchaseResponse placeOrder(Purchase purchase, String oauthSub, String idempotencyKey) {
        if (purchase == null) {
            throw new IllegalArgumentException("Purchase payload is required");
        }
        if (oauthSub == null || oauthSub.isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        if (idempotencyKey.length() > 64) {
            throw new IllegalArgumentException("Idempotency-Key is too long");
        }

        Customer customer = resolveCustomer(purchase.customer(), oauthSub.trim());

        Optional<Order> existing = orderRepository.findByCustomerIdAndIdempotencyKey(
            customer.getId(), idempotencyKey.trim());
        if (existing.isPresent()) {
            Order order = existing.get();
            if (order.getPaymentUrl() == null || order.getPaymentUrl().isBlank()) {
                throw new IllegalStateException("Existing order has no payment URL");
            }
            return new PurchaseResponse(order.getOrderTrackingNumber(), order.getPaymentUrl());
        }

        String currencyCode = CurrencyRates.normalize(purchase.currencyCode());
        BigDecimal fxRate = CurrencyRates.rate(currencyCode);

        Order order = new Order();
        order.setStatus(OrderStatus.PENDING);
        order.setOrderTrackingNumber(generateOrderTrackingNumber());
        order.setCurrencyCode(currencyCode);
        order.setFxRate(fxRate);
        order.setIdempotencyKey(idempotencyKey.trim());
        order.setShippingAddress(toAddress(purchase.shippingAddress()));
        order.setBillingAddress(toAddress(purchase.billingAddress()));
        order.setCustomer(customer);

        BigDecimal totalPrice = BigDecimal.ZERO;
        int totalQuantity = 0;

        for (OrderItemRequest itemRequest : purchase.orderItems()) {
            Product product = productRepository.findById(itemRequest.productId())
                .orElseThrow(() -> new IllegalArgumentException(
                    "Unknown productId: " + itemRequest.productId()));

            if (!product.isActive()) {
                throw new IllegalArgumentException("Product is not available: " + product.getId());
            }
            if (product.getUnitPrice() == null) {
                throw new IllegalArgumentException("Product has no price: " + product.getId());
            }
            if (product.getUnitsInStock() < itemRequest.quantity()) {
                throw new IllegalArgumentException(
                    "Insufficient stock for productId: " + product.getId());
            }

            BigDecimal unitPrice = CurrencyRates.convertFromUsd(product.getUnitPrice(), currencyCode);
            BigDecimal lineTotal = CurrencyRates.lineTotalFromUsd(
                product.getUnitPrice(), itemRequest.quantity(), currencyCode);

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(unitPrice);
            item.setImageUrl(product.getImageUrl());
            order.add(item);

            totalPrice = totalPrice.add(lineTotal);
            totalQuantity += itemRequest.quantity();
        }

        order.setTotalPrice(totalPrice);
        order.setTotalQuantity(totalQuantity);

        try {
            orderRepository.saveAndFlush(order);
        } catch (DataIntegrityViolationException ex) {
            Optional<Order> raced = orderRepository.findByCustomerIdAndIdempotencyKey(
                customer.getId(), idempotencyKey.trim());
            if (raced.isPresent()) {
                Order racedOrder = raced.get();
                return new PurchaseResponse(racedOrder.getOrderTrackingNumber(), racedOrder.getPaymentUrl());
            }
            throw ex;
        }

        CreatePaymentSessionResponse session;
        try {
            session = paymentClient.createSession(
                new CreatePaymentSessionRequest(
                    order.getTotalPrice(),
                    order.getCurrencyCode(),
                    order.getOrderTrackingNumber(),
                    checkoutResultUrl,
                    checkoutResultUrl));
        } catch (RuntimeException ex) {
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.saveAndFlush(order);
            throw new IllegalStateException("Payment session could not be created", ex);
        }
        order.setPaymentSessionId(session.sessionId());
        order.setPaymentUrl(session.checkoutUrl());
        orderRepository.saveAndFlush(order);

        log.info(
            "Checkout placed tracking={} currency={} total={} qty={} awaiting payment session={}",
            order.getOrderTrackingNumber(),
            currencyCode,
            order.getTotalPrice(),
            order.getTotalQuantity(),
            session.sessionId());

        return new PurchaseResponse(order.getOrderTrackingNumber(), session.checkoutUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderStatusResponse getOrderStatus(String orderTrackingNumber, String oauthSub) {
        if (orderTrackingNumber == null || orderTrackingNumber.isBlank()) {
            throw new IllegalArgumentException("Order tracking number is required");
        }
        if (oauthSub == null || oauthSub.isBlank()) {
            throw new IllegalArgumentException("Authenticated subject is required");
        }

        Order order = orderRepository.findByOrderTrackingNumber(orderTrackingNumber.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));

        Customer customer = order.getCustomer();
        if (customer == null || !oauthSub.equals(customer.getOauthSub())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order");
        }

        return new OrderStatusResponse(order.getOrderTrackingNumber(), order.getStatus());
    }

    @Override
    @Transactional
    @CacheEvict(
        cacheNames = {
            "products",
            "productFindById",
            "productFindByCategory",
            "productFindByName"
        },
        allEntries = true)
    public void finalizePayment(PaymentWebhookRequest request) {
        if (request == null
            || request.sessionId() == null
            || request.status() == null
            || request.orderTrackingNumber() == null) {
            throw new IllegalArgumentException("Invalid payment webhook payload");
        }

        Order order = orderRepository.findByOrderTrackingNumber(request.orderTrackingNumber().trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));

        if (order.getPaymentSessionId() == null
            || !order.getPaymentSessionId().equals(request.sessionId().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session does not match order");
        }

        String status = request.status().trim().toUpperCase();
        if ("SUCCEEDED".equals(status)) {
            if (order.getStatus() == OrderStatus.PAID) {
                return;
            }
            if (order.getStatus() != OrderStatus.PENDING) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Order is not awaiting payment");
            }
            for (OrderItem item : order.getOrderItems()) {
                int updated = productRepository.decrementStockIfAvailable(
                    item.getProductId(), item.getQuantity());
                if (updated != 1) {
                    orderPaymentCancelService.markCancelled(order.getId());
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Insufficient stock for productId: " + item.getProductId());
                }
            }
            order.setStatus(OrderStatus.PAID);
            orderRepository.saveAndFlush(order);
            log.info("Payment succeeded tracking={}", order.getOrderTrackingNumber());
            return;
        }

        if ("CANCELLED".equals(status) || "FAILED".equals(status)) {
            if (order.getStatus() == OrderStatus.PAID) {
                return;
            }
            if (order.getStatus() == OrderStatus.PENDING) {
                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.saveAndFlush(order);
                log.info("Payment cancelled tracking={}", order.getOrderTrackingNumber());
            }
            return;
        }

        throw new IllegalArgumentException("Unsupported payment status: " + request.status());
    }

    private Customer resolveCustomer(CustomerRequest request, String oauthSub) {
        String email = request.email().trim().toLowerCase();
        Optional<Customer> bySub = customerRepository.findByOauthSub(oauthSub);
        if (bySub.isPresent()) {
            Customer customer = bySub.get();
            customer.setFirstName(request.firstName().trim());
            customer.setLastName(request.lastName().trim());
            customer.setEmail(email);
            try {
                return customerRepository.saveAndFlush(customer);
            } catch (DataIntegrityViolationException ex) {
                throw new IllegalArgumentException("Email is already linked to another account");
            }
        }

        Optional<Customer> byEmail = customerRepository.findByEmailIgnoreCase(email);
        if (byEmail.isPresent()) {
            Customer customer = byEmail.get();
            if (customer.getOauthSub() != null && !customer.getOauthSub().equals(oauthSub)) {
                throw new IllegalArgumentException("Email is already linked to another account");
            }
            customer.setOauthSub(oauthSub);
            customer.setFirstName(request.firstName().trim());
            customer.setLastName(request.lastName().trim());
            return customerRepository.saveAndFlush(customer);
        }

        Customer customer = new Customer();
        customer.setOauthSub(oauthSub);
        customer.setFirstName(request.firstName().trim());
        customer.setLastName(request.lastName().trim());
        customer.setEmail(email);
        try {
            return customerRepository.saveAndFlush(customer);
        } catch (DataIntegrityViolationException ex) {
            return customerRepository.findByOauthSub(oauthSub)
                .or(() -> customerRepository.findByEmailIgnoreCase(email))
                .orElseThrow(() -> ex);
        }
    }

    private Address toAddress(AddressRequest request) {
        String countryCode = request.countryCode().trim().toUpperCase();
        State state = stateRepository.findById(request.stateId())
            .orElseThrow(() -> new IllegalArgumentException("Unknown stateId: " + request.stateId()));
        if (state.getCountry() == null
            || state.getCountry().getCode() == null
            || !state.getCountry().getCode().equalsIgnoreCase(countryCode)) {
            throw new IllegalArgumentException(
                "stateId " + request.stateId() + " does not belong to country " + countryCode);
        }

        Address address = new Address();
        address.setStreet(request.street().trim());
        address.setCity(request.city().trim());
        address.setZipCode(request.zipCode().trim());
        address.setCountry(countryCode);
        String stateLabel = TranslationResolver.stateName(state, SupportedLocale.DEFAULT);
        address.setState(stateLabel.isBlank() ? String.valueOf(state.getId()) : stateLabel);
        return address;
    }

    private String generateOrderTrackingNumber() {
        for (int i = 0; i < 5; i++) {
            String candidate = UUID.randomUUID().toString();
            if (orderRepository.findByOrderTrackingNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString();
    }
}
