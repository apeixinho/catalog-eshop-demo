package com.app.catalog.i18n;

import com.app.catalog.entity.Country;
import com.app.catalog.entity.CountryTranslation;
import com.app.catalog.entity.Product;
import com.app.catalog.entity.ProductCategory;
import com.app.catalog.entity.ProductCategoryTranslation;
import com.app.catalog.entity.ProductTranslation;
import com.app.catalog.entity.State;
import com.app.catalog.entity.StateTranslation;

import java.util.Collection;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

public final class TranslationResolver {

    private TranslationResolver() {
    }

    @SuppressWarnings("null")
    public static String productName(Product product, String locale) {
        return resolve(product.getTranslations(), locale, ProductTranslation::getLocale, ProductTranslation::getName)
            .orElse("");
    }

    @SuppressWarnings("null")
    public static String productDescription(Product product, String locale) {
        return resolve(
                product.getTranslations(),
                locale,
                ProductTranslation::getLocale,
                ProductTranslation::getDescription)
            .orElse("");
    }

    @SuppressWarnings("null")
    public static String categoryName(ProductCategory category, String locale) {
        return resolve(
                category.getTranslations(),
                locale,
                ProductCategoryTranslation::getLocale,
                ProductCategoryTranslation::getName)
            .orElse("");
    }

    @SuppressWarnings("null")
    public static String countryName(Country country, String locale) {
        return resolve(
                country.getTranslations(),
                locale,
                CountryTranslation::getLocale,
                CountryTranslation::getName)
            .orElse("");
    }

    @SuppressWarnings("null")
    public static String stateName(State state, String locale) {
        return resolve(state.getTranslations(), locale, StateTranslation::getLocale, StateTranslation::getName)
            .orElse("");
    }

    @SuppressWarnings("null")
    private static <T> Optional<String> resolve(
        Collection<T> translations,
        String locale,
        Function<T, String> localeFn,
        Function<T, String> valueFn) {

        if (translations == null || translations.isEmpty()) {
            return Optional.empty();
        }
        Optional<String> requested = translations.stream()
            .filter(t -> Objects.equals(localeFn.apply(t), locale))
            .map(valueFn)
            .findFirst();
        if (requested.isPresent()) {
            return requested;
        }
        Optional<String> fallback = translations.stream()
            .filter(t -> Objects.equals(localeFn.apply(t), SupportedLocale.DEFAULT))
            .map(valueFn)
            .findFirst();
        if (fallback.isEmpty()) {
            return Optional.of("[missing translation]");
        }
        return fallback;
    }
}
