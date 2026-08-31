package com.app.catalog.auth.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.authorization.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.token.DelegatingOAuth2TokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.JwtGenerator;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;

@Configuration
@EnableWebSecurity
public class AuthorizationServerConfig {

    @Value("${catalog.auth.issuer-uri:http://localhost:9000}")
    private String issuerUri;

    @Value("${catalog.auth.frontend-origin:http://localhost:4200}")
    private String frontendOrigin;

    @Value("${catalog.auth.audience:catalog-api}")
    private String audience;

    @Bean
    @Order(1)
    SecurityFilterChain authorizationServerSecurityFilterChain(
        HttpSecurity http,
        RegisteredClientRepository registeredClientRepository,
        OAuth2TokenGenerator<?> tokenGenerator
    ) throws Exception {
        OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
            new OAuth2AuthorizationServerConfigurer();

        http
            .securityMatcher(authorizationServerConfigurer.getEndpointsMatcher())
            .with(authorizationServerConfigurer, authorizationServer -> authorizationServer
                .oidc(Customizer.withDefaults())
                .tokenGenerator(tokenGenerator)
                .clientAuthentication(clientAuth -> clientAuth
                    .authenticationConverters(converters ->
                        converters.add(new PublicClientRefreshTokenAuthenticationConverter()))
                    .authenticationProviders(providers ->
                        providers.add(new PublicClientRefreshTokenAuthenticationProvider(
                            registeredClientRepository)))
                )
            )
            .authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
            .exceptionHandling(exceptions -> exceptions
                .defaultAuthenticationEntryPointFor(
                    new LoginUrlAuthenticationEntryPoint("/login"),
                    new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                )
            )
            .cors(Customizer.withDefaults())
            .oauth2ResourceServer(resourceServer -> resourceServer.jwt(Customizer.withDefaults()));

        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/login", "/error", "/css/**").permitAll()
                .anyRequest().authenticated()
            )
            .cors(Customizer.withDefaults())
            .formLogin(form -> form.loginPage("/login").permitAll());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }

    @Bean
    AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
            .issuer(issuerUri)
            .build();
    }

    @Bean
    @SuppressWarnings("null")
    OAuth2TokenCustomizer<JwtEncodingContext> jwtCustomizer() {
        return context -> {
            if (OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
                context.getClaims().audience(List.of(audience));
                Authentication principal = context.getPrincipal();
                if (principal != null) {
                    List<String> roles = principal.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .filter(authority -> authority.startsWith("ROLE_"))
                        .map(authority -> authority.substring("ROLE_".length()))
                        .collect(Collectors.toList());
                    if (!roles.isEmpty()) {
                        context.getClaims().claim("roles", roles);
                    }
                    if (principal.getName() != null && !principal.getName().isBlank()) {
                        context.getClaims().claim("preferred_username", principal.getName());
                    }
                }
            }
        };
    }

    @Bean
    OAuth2TokenGenerator<?> tokenGenerator(
        JWKSource<SecurityContext> jwkSource,
        OAuth2TokenCustomizer<JwtEncodingContext> jwtCustomizer
    ) {
        JwtGenerator jwtGenerator = new JwtGenerator(new NimbusJwtEncoder(jwkSource));
        jwtGenerator.setJwtCustomizer(jwtCustomizer);
        return new DelegatingOAuth2TokenGenerator(
            jwtGenerator,
            new PublicClientRefreshTokenGenerator()
        );
    }

    @Bean
    @SuppressWarnings("null")
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(frontendOrigin.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
