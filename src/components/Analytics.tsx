"use client";

import { useEffect, useMemo, useRef } from "react";

type AnalyticsProps = {
  articleId?: number;
  locale: string;
  eventType?: "page_view" | "article_view";
};

function getId(key: string) {
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const next = makeId();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return makeId();
  }
}

function makeId() {
  try {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch {
    // Fall back below for insecure HTTP or restricted browser storage contexts.
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function sendEvent(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }

    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // Analytics must never break page rendering.
  }
}

export function Analytics({ articleId, locale, eventType }: AnalyticsProps) {
  const startedAt = useRef(Date.now());
  const maxScroll = useRef(0);
  const ids = useMemo(() => ({ session: "", visitor: "" }), []);

  useEffect(() => {
    ids.session = getId("session_id");
    ids.visitor = getId("visitor_id");

    const basePayload = {
      eventType: eventType || (articleId ? "article_view" : "page_view"),
      articleId,
      locale,
      path: window.location.pathname,
      referrer: document.referrer || null,
      sessionId: ids.session,
      visitorId: ids.visitor,
      deviceType: window.innerWidth < 740 ? "mobile" : "desktop"
    };

    sendEvent(basePayload);

    function updateScrollDepth() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        maxScroll.current = 100;
        return;
      }

      maxScroll.current = Math.max(
        maxScroll.current,
        Math.min(100, Math.round((window.scrollY / scrollable) * 100))
      );
    }

    function heartbeat() {
      sendEvent({
        eventType: "heartbeat",
        articleId,
        locale,
        path: window.location.pathname,
        sessionId: ids.session,
        visitorId: ids.visitor,
        durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        scrollDepth: maxScroll.current
      });
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");

      if (!link) {
        return;
      }

      sendEvent({
        eventType: "click",
        articleId,
        locale,
        path: window.location.pathname,
        targetUrl: link.href,
        targetType: link.hostname === window.location.hostname ? "internal" : "outbound",
        sessionId: ids.session,
        visitorId: ids.visitor
      });
    }

    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    document.addEventListener("click", handleClick);
    const interval = window.setInterval(heartbeat, 15000);

    return () => {
      heartbeat();
      window.removeEventListener("scroll", updateScrollDepth);
      document.removeEventListener("click", handleClick);
      window.clearInterval(interval);
    };
  }, [articleId, eventType, ids, locale]);

  return null;
}
