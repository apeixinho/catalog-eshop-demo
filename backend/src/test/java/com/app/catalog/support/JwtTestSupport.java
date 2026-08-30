package com.app.catalog.support;

import java.util.Collection;
import java.util.List;
import java.util.function.Consumer;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/** Builds MockMvc JWT post-processors using the app's {@code jwtGrantedAuthoritiesConverter}. */
public final class JwtTestSupport {

    private JwtTestSupport() {
    }

    public static RequestPostProcessor catalogWriteJwt(
        Converter<Jwt, Collection<GrantedAuthority>> converter,
        String subject
    ) {
        return withClaims(converter, j -> j.subject(subject).claim("scope", "catalog.write"));
    }

    public static RequestPostProcessor managerJwt(
        Converter<Jwt, Collection<GrantedAuthority>> converter,
        String subject
    ) {
        return withClaims(converter, j -> j.subject(subject)
            .claim("scope", "catalog.write")
            .claim("roles", List.of("USER", "MANAGER")));
    }

    public static RequestPostProcessor adminJwt(
        Converter<Jwt, Collection<GrantedAuthority>> converter,
        String subject
    ) {
        return withClaims(converter, j -> j.subject(subject)
            .claim("scope", "catalog.write")
            .claim("roles", List.of("USER", "ADMIN")));
    }

    public static RequestPostProcessor withClaims(
        Converter<Jwt, Collection<GrantedAuthority>> converter,
        Consumer<Jwt.Builder> customizer
    ) {
        return jwt().jwt(customizer).authorities(converter);
    }
}
