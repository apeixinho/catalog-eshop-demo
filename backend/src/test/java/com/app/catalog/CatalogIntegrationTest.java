package com.app.catalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class CatalogIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void searchByNameReturnsMatchingProducts() throws Exception {
        mockMvc.perform(get("/api/v1/products/search/findByNameContaining")
                .param("name", "Python")
                .param("page", "0")
                .param("size", "8"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name").value("Crash Course in Python"));
    }

    @Test
    void searchByNameRespectsLocale() throws Exception {
        mockMvc.perform(get("/api/v1/products/search/findByNameContaining")
                .param("name", "Python")
                .param("lang", "pt")
                .param("page", "0")
                .param("size", "8"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name").value("Curso Intensivo de Python"));
    }

    @Test
    void searchByCategoryReturnsCategoryProductsOnly() throws Exception {
        mockMvc.perform(get("/api/v1/products/search/findByCategoryId")
                .param("id", "2")
                .param("page", "0")
                .param("size", "8"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(8))
            .andExpect(jsonPath("$.content[0].category.categoryName").value("Coffee Mugs"));
    }

    @Test
    void productCategoriesAreListed() throws Exception {
        mockMvc.perform(get("/api/v1/product-category"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[?(@.categoryName=='Books')]").exists());
    }
}
