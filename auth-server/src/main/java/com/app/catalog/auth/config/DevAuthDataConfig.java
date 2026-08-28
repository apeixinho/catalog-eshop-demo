package com.app.catalog.auth.config;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
@Profile("!staging")
public class DevAuthDataConfig {

    @Value("${catalog.auth.frontend-origin:http://localhost:4200}")
    private String frontendOrigin;

    @Value("${catalog.auth.client-id:catalog-spa}")
    private String clientId;

    @Bean
    UserDetailsService userDetailsService(PasswordEncoder passwordEncoder) {
        return new InMemoryUserDetailsManager(
            User.builder()
                .username("user")
                .password(passwordEncoder.encode("password"))
                .roles("USER")
                .build(),
            User.builder()
                .username("admin")
                .password(passwordEncoder.encode("password"))
                .roles("USER", "ADMIN")
                .build()
        );
    }

    @Bean
    RegisteredClientRepository registeredClientRepository() {
        return new InMemoryRegisteredClientRepository(spaClient(clientId, frontendOrigin));
    }

    @Bean
    OAuth2AuthorizationService authorizationService() {
        return new InMemoryOAuth2AuthorizationService();
    }

    static RegisteredClient spaClient(String clientId, String frontendOrigin) {
        List<String> origins = Arrays.stream(frontendOrigin.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
        if (origins.isEmpty()) {
            origins = List.of("http://localhost:4200");
        }

        RegisteredClient.Builder builder = RegisteredClient.withId(UUID.randomUUID().toString())
            .clientId(clientId)
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .scope(OidcScopes.OPENID)
            .scope(OidcScopes.PROFILE)
            .scope("catalog.read")
            .scope("catalog.write")
            .clientSettings(ClientSettings.builder()
                .requireProofKey(true)
                .requireAuthorizationConsent(false)
                .build())
            .tokenSettings(TokenSettings.builder()
                .reuseRefreshTokens(false)
                .build());

        for (String origin : origins) {
            builder.redirectUri(origin + "/auth/callback");
            builder.postLogoutRedirectUri(origin + "/products");
        }

        return builder.build();
    }
}
