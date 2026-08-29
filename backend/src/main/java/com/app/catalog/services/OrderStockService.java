package com.app.catalog.services;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.catalog.entity.Order;
import com.app.catalog.entity.OrderItem;
import com.app.catalog.repository.ProductRepository;

@Service
public class OrderStockService {

    private final ProductRepository productRepository;

    public OrderStockService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    @CacheEvict(
        cacheNames = {
            "products",
            "productFindById",
            "productFindByCategory",
            "productFindByName"
        },
        allEntries = true)
    public void restoreStockForOrder(Order order) {
        for (OrderItem item : order.getOrderItems()) {
            int updated = productRepository.incrementStock(item.getProductId(), item.getQuantity());
            if (updated != 1) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Could not restore stock for productId: " + item.getProductId());
            }
        }
    }
}
