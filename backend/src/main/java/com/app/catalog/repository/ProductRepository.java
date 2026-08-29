package com.app.catalog.repository;

import com.app.catalog.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByCategoryIdAndActiveTrue(Long id, Pageable pageable);

    Page<Product> findByActiveTrue(Pageable pageable);

    /**
     * Matches product name in any translation locale (or SKU); display language is applied later.
     */
    @Query("""
        SELECT DISTINCT p FROM Product p
        JOIN p.translations t
        WHERE p.active = true
          AND (
            LOWER(t.name) LIKE LOWER(CONCAT('%', :name, '%'))
            OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :name, '%'))
          )
          AND (:categoryId IS NULL OR p.category.id = :categoryId)
        """)
    Page<Product> findByTranslatedNameContaining(
        @Param("name") String name,
        @Param("categoryId") Long categoryId,
        Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Product p
        SET p.unitsInStock = p.unitsInStock - :qty, p.version = p.version + 1
        WHERE p.id = :id AND p.active = true AND p.unitsInStock >= :qty
        """)
    int decrementStockIfAvailable(@Param("id") Long id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Product p
        SET p.unitsInStock = p.unitsInStock + :qty, p.version = p.version + 1
        WHERE p.id = :id AND p.active = true
        """)
    int incrementStock(@Param("id") Long id, @Param("qty") int qty);
}
