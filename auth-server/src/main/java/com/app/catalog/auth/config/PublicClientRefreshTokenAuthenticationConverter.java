package com.app.catalog.auth.config;

import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2ClientAuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationConverter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;

/**
 * Authenticates public clients on the refresh_token grant (no client_secret, no PKCE).
 */
final class PublicClientRefreshTokenAuthenticationConverter implements AuthenticationConverter {

    @Override
    @SuppressWarnings("null")
    public @Nullable Authentication convert(HttpServletRequest request) {
        String grantType = request.getParameter(OAuth2ParameterNames.GRANT_TYPE);
        if (!AuthorizationGrantType.REFRESH_TOKEN.getValue().equals(grantType)) {
            return null;
        }

        // Confidential clients send client_secret; leave those to other converters.
        if (StringUtils.hasText(request.getParameter(OAuth2ParameterNames.CLIENT_SECRET))) {
            return null;
        }

        MultiValueMap<String, String> parameters = getFormParameters(request);
        String clientId = parameters.getFirst(OAuth2ParameterNames.CLIENT_ID);
        if (!StringUtils.hasText(clientId) || parameters.get(OAuth2ParameterNames.CLIENT_ID).size() != 1) {
            throw new OAuth2AuthenticationException(OAuth2ErrorCodes.INVALID_REQUEST);
        }

        parameters.remove(OAuth2ParameterNames.CLIENT_ID);

        Map<String, Object> additionalParameters = new HashMap<>();
        parameters.forEach((key, value) ->
            additionalParameters.put(key, (value.size() == 1) ? value.get(0) : value.toArray(new String[0])));

        return new OAuth2ClientAuthenticationToken(
            clientId, ClientAuthenticationMethod.NONE, null, additionalParameters);
    }

    @SuppressWarnings("null")
    private static MultiValueMap<String, String> getFormParameters(HttpServletRequest request) {
        Map<String, String[]> parameterMap = request.getParameterMap();
        MultiValueMap<String, String> parameters = new LinkedMultiValueMap<>();
        String queryString = StringUtils.hasText(request.getQueryString()) ? request.getQueryString() : "";
        parameterMap.forEach((key, values) -> {
            if (!queryString.contains(key) && values != null && values.length > 0) {
                for (String value : values) {
                    parameters.add(key, value);
                }
            }
        });
        return parameters;
    }
}
