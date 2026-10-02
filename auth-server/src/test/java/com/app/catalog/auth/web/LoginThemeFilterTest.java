package com.app.catalog.auth.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class LoginThemeFilterTest {

    @Test
    void normalizeAcceptsKnownIdsAndLegacyAliases() {
        assertThat(LoginThemeFilter.normalize("default")).isEqualTo("default");
        assertThat(LoginThemeFilter.normalize("alternative")).isEqualTo("alternative");
        assertThat(LoginThemeFilter.normalize("catalog")).isEqualTo("default");
        assertThat(LoginThemeFilter.normalize("application")).isEqualTo("alternative");
        assertThat(LoginThemeFilter.normalize("UNKNOWN")).isEqualTo("default");
        assertThat(LoginThemeFilter.normalize(null)).isNull();
        assertThat(LoginThemeFilter.normalize("  ")).isNull();
    }

    @Test
    void resolvePrefersQueryThenSessionThenDefault() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        assertThat(LoginThemeFilter.resolve(request, null)).isEqualTo("default");

        request.getSession(true).setAttribute(LoginThemeFilter.SESSION_ATTR, "alternative");
        assertThat(LoginThemeFilter.resolve(request, null)).isEqualTo("alternative");
        assertThat(LoginThemeFilter.resolve(request, "default")).isEqualTo("default");
    }
}
