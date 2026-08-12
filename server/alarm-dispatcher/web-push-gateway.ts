import webpush from "web-push";
import type {
  DispatcherConfig,
  PushGateway,
  PushMessage,
  PushProviderResult,
} from "./types";

function statusCodeFromError(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Web Push (VAPID) adapter. The only part of the dispatcher that talks to a provider. */
export class WebPushGateway implements PushGateway {
  constructor(
    config: Pick<DispatcherConfig, "vapidPublicKey" | "vapidPrivateKey" | "vapidEmail">,
  ) {
    webpush.setVapidDetails(
      config.vapidEmail,
      config.vapidPublicKey,
      config.vapidPrivateKey,
    );
  }

  async send(message: PushMessage): Promise<PushProviderResult> {
    try {
      const response = await webpush.sendNotification(
        {
          endpoint: message.endpoint,
          keys: { p256dh: message.p256dh, auth: message.auth },
        },
        message.payload,
        // An alarm is worthless if it arrives late: deliver urgently and give up
        // after 5 minutes rather than waking someone at the wrong time.
        { urgency: "high", TTL: 300 },
      );

      return {
        ok: true,
        statusCode: response.statusCode,
        messageId: response.headers?.location,
      };
    } catch (error) {
      const statusCode = statusCodeFromError(error);
      const messageText = messageFromError(error);
      const invalidSubscription =
        statusCode === 404 ||
        statusCode === 410 ||
        /\b(?:404|410|gone|not.?found)\b/i.test(messageText);
      // No status code means the request never got an answer (DNS, socket,
      // timeout) — that is transient, not a rejection.
      const retryable =
        !invalidSubscription &&
        (statusCode === undefined ||
          statusCode === 408 ||
          statusCode === 425 ||
          statusCode === 429 ||
          (statusCode >= 500 && statusCode <= 599));

      return {
        ok: false,
        statusCode,
        code: invalidSubscription
          ? "invalid_subscription"
          : retryable
            ? "push_transient_failure"
            : "push_provider_failure",
        message: messageText.slice(0, 2_000),
        retryable,
        invalidSubscription,
      };
    }
  }
}
