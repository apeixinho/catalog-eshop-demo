package com.app.catalog.auth.web;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Captures {@code theme} / {@code ui_theme} from the authorize request and stores
 * it in the HTTP session so the login form matches the SPA theme after redirect
 * to {@code /login}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 21)
public class LoginThemeFilter extends OncePerRequestFilter {

    static final String SESSION_ATTR = "catalog.login.theme";

    private static final Set<String> SUPPORTED = Set.of("default", "alternative");

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path != null && path.contains("/oauth2/authorize")) {
            String raw = firstNonBlank(request.getParameter("theme"), request.getParameter("ui_theme"));
            String normalized = normalize(raw);
            if (normalized != null) {
                request.getSession(true).setAttribute(SESSION_ATTR, normalized);
            }
        }
        filterChain.doFilter(request, response);
    }

    static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        // Legacy SPA ids (keep in sync with frontend theme.models.ts).
        if ("catalog".equals(value)) {
            return "default";
        }
        if ("application".equals(value)) {
            return "alternative";
        }
        return SUPPORTED.contains(value) ? value : "default";
    }

    static String resolve(HttpServletRequest request, String fromQuery) {
        String normalized = normalize(fromQuery);
        if (normalized != null) {
            return normalized;
        }
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object stored = session.getAttribute(SESSION_ATTR);
            if (stored instanceof String s) {
                String fromSession = normalize(s);
                if (fromSession != null) {
                    return fromSession;
                }
            }
        }
        return "default";
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }
}
