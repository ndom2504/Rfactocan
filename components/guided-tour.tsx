"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  TOUR_START_EVENT,
  TOUR_STEPS,
  isTourDone,
  markTourDone,
  type TourStep,
} from "@/lib/guided-tour";

type Rect = { top: number; left: number; width: number; height: number };

function findVisible(selector: string): Element | null {
  const nodes = Array.from(document.querySelectorAll(selector));
  return (
    nodes.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

function waitForSelector(selector: string, timeoutMs = 4000) {
  return new Promise<Element | null>((resolve) => {
    const existing = findVisible(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      const el = findVisible(selector);
      if (el) {
        window.clearInterval(id);
        resolve(el);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(id);
        resolve(null);
      }
    }, 80);
  });
}

export function GuidedTour() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  const step: TourStep | undefined = TOUR_STEPS[index];

  function finish() {
    markTourDone();
    setActive(false);
    setIndex(0);
    setRect(null);
    setReady(false);
  }

  function start() {
    setIndex(0);
    setActive(true);
    setReady(false);
  }

  useEffect(() => {
    function onStart() {
      start();
    }
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (isTourDone()) return;
    const timer = window.setTimeout(() => start(), 600);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!active || !step) return;
    let cancelled = false;

    async function place() {
      setReady(false);
      if (pathname !== step.route) {
        router.push(step.route);
        return;
      }
      const el = await waitForSelector(step.selector);
      if (cancelled) return;
      if (!el) {
        // Skip missing targets (empty lists, etc.)
        if (index < TOUR_STEPS.length - 1) {
          setIndex((i) => i + 1);
        } else {
          finish();
        }
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      setReady(true);
    }

    void place();
    return () => {
      cancelled = true;
    };
  }, [active, step, pathname, index, router]);

  useLayoutEffect(() => {
    if (!active || !step || pathname !== step.route) return;

    function update() {
      const el = findVisible(step.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    }

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step, pathname]);

  if (!active || !step) return null;

  const pad = 8;
  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
        height: rect.height + pad * 2,
      }
    : null;

  const tooltipTop = highlight
    ? (() => {
        const below = highlight.top + highlight.height + 12;
        if (below + 200 < window.innerHeight) return below;
        return Math.max(12, highlight.top - 200);
      })()
    : 80;
  const tooltipLeft = highlight
    ? Math.min(window.innerWidth - 320, Math.max(12, highlight.left))
    : 12;

  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {ready && highlight ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[var(--accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/45" />
      )}

      {/* Click catcher outside tooltip */}
      <button
        type="button"
        aria-label={t("tour_skip")}
        className="absolute inset-0 z-[100] cursor-default"
        onClick={finish}
      />

      {ready && (
        <div
          className="absolute z-[101] w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
          style={{ top: tooltipTop, left: tooltipLeft }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
            {t("tour_label")} · {index + 1}/{TOUR_STEPS.length}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
            {t(step.titleKey)}
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{t(step.bodyKey)}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm text-[var(--muted)] underline"
              onClick={finish}
            >
              {t("tour_skip")}
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  {t("tour_prev")}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (isLast) finish();
                  else setIndex((i) => i + 1);
                }}
              >
                {isLast ? t("tour_done") : t("tour_next")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
