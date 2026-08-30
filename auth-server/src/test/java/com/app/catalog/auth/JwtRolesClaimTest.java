package com.app.catalog.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;

@SpringBootTest
class JwtRolesClaimTest {

    @Autowired
    private OAuth2TokenCustomizer<JwtEncodingContext> jwtCustomizer;

    @Autowired
    private UserDetailsService userDetailsService;

    @Test
    void managerAccessTokenIncludesRolesClaim() {
        assertRolesClaim("manager", List.of("USER", "MANAGER"));
    }

    @Test
    void adminAccessTokenIncludesRolesClaim() {
        assertRolesClaim("admin", List.of("USER", "ADMIN"));
    }

    @Test
    void shopperAccessTokenIncludesUserRoleOnly() {
        assertRolesClaim("user", List.of("USER"));
    }

    private void assertRolesClaim(String username, List<String> expectedRoles) {
        UserDetails user = userDetailsService.loadUserByUsername(username);
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
            user, null, user.getAuthorities());

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder();
        JwtEncodingContext context = mock(JwtEncodingContext.class);
        when(context.getTokenType()).thenReturn(OAuth2TokenType.ACCESS_TOKEN);
        when(context.getPrincipal()).thenReturn(authentication);
        when(context.getClaims()).thenReturn(claimsBuilder);

        jwtCustomizer.customize(context);

        JwtClaimsSet claims = claimsBuilder.build();
        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) claims.getClaim("roles");
        assertThat(roles).containsExactlyInAnyOrderElementsOf(expectedRoles);
        assertThat(claims.getClaimAsString("preferred_username")).isEqualTo(username);
    }
}
