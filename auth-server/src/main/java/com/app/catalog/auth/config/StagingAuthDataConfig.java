package com.app.catalog.auth.config;

import java.util.List;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.jackson.SecurityJacksonModules;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.provisioning.JdbcUserDetailsManager;

import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

@Configuration
@Profile("staging")
public class StagingAuthDataConfig {

    @Value("${catalog.auth.frontend-origin:http://localhost:4200}")
    private String frontendOrigin;

    @Value("${catalog.auth.client-id:catalog-spa}")
    private String clientId;

    @Bean
    UserDetailsService userDetailsService(DataSource dataSource) {
        JdbcUserDetailsManager users = new JdbcUserDetailsManager(dataSource);
        users.setUsersByUsernameQuery(
            "select username, password, enabled from users where username = ?");
        users.setAuthoritiesByUsernameQuery(
            "select username, authority from authorities where username = ?");
        return users;
    }

    @Bean
    RegisteredClientRepository registeredClientRepository(JdbcTemplate jdbcTemplate) {
        return new JdbcRegisteredClientRepository(jdbcTemplate);
    }

    @Bean
    OAuth2AuthorizationService authorizationService(
        JdbcTemplate jdbcTemplate,
        RegisteredClientRepository registeredClientRepository
    ) {
        JdbcOAuth2AuthorizationService service =
            new JdbcOAuth2AuthorizationService(jdbcTemplate, registeredClientRepository);
        // Allow List.of() / ImmutableCollections types already persisted in token
        // metadata so OIDC logout (findByToken → deserialize) does not 400.
        service.setAuthorizationRowMapper(
            new JdbcOAuth2AuthorizationService.JsonMapperOAuth2AuthorizationRowMapper(
                registeredClientRepository, authorizationJsonMapper()));
        return service;
    }

    private static JsonMapper authorizationJsonMapper() {
        ClassLoader classLoader = StagingAuthDataConfig.class.getClassLoader();
        BasicPolymorphicTypeValidator.Builder builder = BasicPolymorphicTypeValidator.builder()
            .allowIfSubType("java.util.ImmutableCollections");
        List<JacksonModule> modules = SecurityJacksonModules.getModules(classLoader, builder);
        return JsonMapper.builder().addModules(modules).build();
    }

    @Bean
    OAuth2AuthorizationConsentService authorizationConsentService(
        JdbcTemplate jdbcTemplate,
        RegisteredClientRepository registeredClientRepository
    ) {
        return new JdbcOAuth2AuthorizationConsentService(jdbcTemplate, registeredClientRepository);
    }

    @Bean
    ApplicationRunner seedSpaClient(RegisteredClientRepository clients) {
        return args -> {
            RegisteredClient desired = DevAuthDataConfig.spaClient(clientId, frontendOrigin);
            RegisteredClient existing = clients.findByClientId(clientId);
            if (existing == null) {
                clients.save(desired);
                return;
            }
            // Reconcile redirect URIs / settings when FRONTEND_ORIGIN or scopes change.
            clients.save(RegisteredClient.from(existing)
                .redirectUris(uris -> {
                    uris.clear();
                    uris.addAll(desired.getRedirectUris());
                })
                .postLogoutRedirectUris(uris -> {
                    uris.clear();
                    uris.addAll(desired.getPostLogoutRedirectUris());
                })
                .scopes(scopes -> {
                    scopes.clear();
                    scopes.addAll(desired.getScopes());
                })
                .clientSettings(desired.getClientSettings())
                .tokenSettings(desired.getTokenSettings())
                .build());
        };
    }
}
