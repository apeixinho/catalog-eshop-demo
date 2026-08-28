package com.app.catalog.auth.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator;

@ExtendWith(MockitoExtension.class)
class PublicClientRefreshTokenGeneratorTest {

    @Mock
    private OAuth2TokenContext context;

    private final OAuth2TokenGenerator<OAuth2RefreshToken> generator =
        new PublicClientRefreshTokenGenerator();

    @Test
    void issuesRefreshTokenForPublicClient() {
        RegisteredClient client = RegisteredClient.withId("test")
            .clientId("spa")
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .build();

        when(context.getTokenType()).thenReturn(OAuth2TokenType.REFRESH_TOKEN);
        when(context.getRegisteredClient()).thenReturn(client);

        OAuth2RefreshToken token = generator.generate(context);

        assertThat(token).isNotNull();
        assertThat(token.getTokenValue()).isNotBlank();
        assertThat(token.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void skipsConfidentialClient() {
        RegisteredClient client = RegisteredClient.withId("test")
            .clientId("confidential")
            .clientSecret("{noop}secret")
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .build();

        when(context.getTokenType()).thenReturn(OAuth2TokenType.REFRESH_TOKEN);
        when(context.getRegisteredClient()).thenReturn(client);

        OAuth2RefreshToken token = generator.generate(context);

        assertThat(token).isNull();
    }
}
