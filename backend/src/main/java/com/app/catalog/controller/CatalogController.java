package com.app.catalog.controller;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import com.app.catalog.entity.Product;
import com.app.catalog.i18n.SupportedLocale;
import com.app.catalog.mapper.CountryMapper;
import com.app.catalog.mapper.ProductMapper;
import com.app.catalog.mapper.StateMapper;
import com.app.catalog.model.CountryDTO;
import com.app.catalog.model.ProductCategoryDTO;
import com.app.catalog.model.ProductDTO;
import com.app.catalog.model.StateDTO;
import com.app.catalog.services.CatalogService;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CatalogController {

    private static final int MAX_PAGE_SIZE = 50;
    private static final String LOCALE_KEY =
        "T(com.app.catalog.i18n.SupportedLocale).normalize(#lang)";

    private final String API_PATH = "/api/v1";
    private final CatalogService catalogService;
    private final ProductMapper productMapper;
    private final StateMapper stateMapper;
    private final CountryMapper countryMapper;

    public CatalogController(
        CatalogService catalogService,
        ProductMapper productMapper,
        StateMapper stateMapper,
        CountryMapper countryMapper) {
        this.catalogService = catalogService;
        this.productMapper = productMapper;
        this.stateMapper = stateMapper;
        this.countryMapper = countryMapper;
    }

    @GetMapping(API_PATH + "/products/search/findByCategoryId")
    @Cacheable(value = "productFindByCategory", key = "{#page, #size, #id, " + LOCALE_KEY + "}")
    public Page<ProductDTO> searchProductByCategoryId(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        @RequestParam long id,
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);
        Pageable currentPage = pageRequest(page, size);

        return catalogService
            .findByCategoryId(id, currentPage)
            .map(product -> productMapper.productToProductDto(product, locale));
    }

    @GetMapping(API_PATH + "/products/search/findByNameContaining")
    @Cacheable(
        value = "productFindByName",
        key = "{#page, #size, #name, #categoryId, " + LOCALE_KEY + "}")
    public Page<ProductDTO> searchProductByName(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        @RequestParam String name,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);
        String normalizedName = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        if (normalizedName.length() > 100) {
            normalizedName = normalizedName.substring(0, 100);
        }
        Pageable currentPage = pageRequest(page, size);

        return catalogService
            .findByNameContaining(normalizedName, categoryId, currentPage)
            .map(product -> productMapper.productToProductDto(product, locale));
    }

    @GetMapping(API_PATH + "/product-category")
    @Cacheable(value = "product-category", key = LOCALE_KEY)
    public List<ProductCategoryDTO> getProductCategories(
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);

        return catalogService
            .getProductCategories()
            .stream()
            .map(category -> productMapper.productCategoryToProductCategoryDto(category, locale))
            .collect(Collectors.toList());
    }

    @GetMapping(API_PATH + "/products")
    @Cacheable(value = "products", key = "{#page, #size, " + LOCALE_KEY + "}")
    public Page<ProductDTO> getProducts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);
        Pageable currentPage = pageRequest(page, size);

        return catalogService
            .getProducts(currentPage)
            .map(product -> productMapper.productToProductDto(product, locale));
    }

    @GetMapping(API_PATH + "/products/{id}")
    @Cacheable(
        value = "productFindById",
        key = "{#id, " + LOCALE_KEY + "}",
        unless = "#result == null || !#result.statusCode.is2xxSuccessful()")
    public ResponseEntity<ProductDTO> getProductById(
        @PathVariable long id,
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);

        return catalogService
            .findByProductId(id)
            .map(product -> productMapper.productToProductDto(product, locale))
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping(API_PATH + "/states/search/findByCountryCode")
    @Cacheable(value = "stateByCountryCode", key = "{#code, " + LOCALE_KEY + "}")
    public List<StateDTO> getStatesByCountryCode(
        @RequestParam String code,
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);
        String normalizedCode = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);

        return catalogService
            .getStatesByCountryCode(normalizedCode)
            .stream()
            .map(state -> stateMapper.stateToStateDto(state, locale))
            .collect(Collectors.toList());
    }

    @GetMapping(API_PATH + "/countries")
    @Cacheable(value = "countries", key = LOCALE_KEY)
    public List<CountryDTO> getCountries(
        @RequestParam(required = false) String lang) {

        String locale = SupportedLocale.normalize(lang);

        return catalogService
            .getCountries()
            .stream()
            .map(country -> countryMapper.countryToCountryDto(country, locale))
            .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    private static Pageable pageRequest(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be >= 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return PageRequest.of(page, size, Sort.by(Sort.Order.asc(Product::getId)));
    }
}
