package com.app.catalog.payment.web;

import java.net.URI;

import com.app.catalog.payment.model.PaymentSession;
import com.app.catalog.payment.service.CatalogWebhookClient;
import com.app.catalog.payment.service.PaymentSessionStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;

@Controller
public class CheckoutPageController {

    private final PaymentSessionStore store;
    private final CatalogWebhookClient webhookClient;

    public CheckoutPageController(PaymentSessionStore store, CatalogWebhookClient webhookClient) {
        this.store = store;
        this.webhookClient = webhookClient;
    }

    @GetMapping("/checkout/{sessionId}")
    public String checkout(@PathVariable String sessionId, Model model) {
        PaymentSession session = requireSession(sessionId);
        model.addAttribute("payment", session);
        return "checkout";
    }

    @PostMapping("/checkout/{sessionId}/pay")
    public RedirectView pay(@PathVariable String sessionId) {
        PaymentSession session = requireSession(sessionId);

        if (session.getStatus() == PaymentSession.Status.SUCCEEDED) {
            return redirect(appendQuery(session.getSuccessUrl(), session));
        }
        if (session.getStatus() == PaymentSession.Status.CANCELLED
            || session.getStatus() == PaymentSession.Status.FAILED) {
            return redirect(appendQuery(session.getCancelUrl(), session));
        }

        String failure = webhookClient.notify(session, PaymentSession.Status.SUCCEEDED);
        if (failure != null) {
            session.setStatus(PaymentSession.Status.FAILED);
            session.setFailureReason(failure);
            webhookClient.notify(session, PaymentSession.Status.CANCELLED);
            return redirect(appendQuery(session.getCancelUrl(), session));
        }

        session.setStatus(PaymentSession.Status.SUCCEEDED);
        return redirect(appendQuery(session.getSuccessUrl(), session));
    }

    @PostMapping("/checkout/{sessionId}/cancel")
    public RedirectView cancel(@PathVariable String sessionId) {
        PaymentSession session = requireSession(sessionId);

        if (session.getStatus() == PaymentSession.Status.OPEN) {
            session.setStatus(PaymentSession.Status.CANCELLED);
            webhookClient.notify(session, PaymentSession.Status.CANCELLED);
        }
        return redirect(appendQuery(session.getCancelUrl(), session));
    }

    private PaymentSession requireSession(String sessionId) {
        return store.find(sessionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown session"));
    }

    private static RedirectView redirect(String url) {
        RedirectView view = new RedirectView(url);
        view.setStatusCode(HttpStatus.FOUND);
        return view;
    }

    private static String appendQuery(String baseUrl, PaymentSession session) {
        return UriComponentsBuilder.fromUri(URI.create(baseUrl))
            .queryParam("session", session.getId())
            .queryParam("tracking", session.getOrderTrackingNumber())
            .build(true)
            .toUriString();
    }
}
