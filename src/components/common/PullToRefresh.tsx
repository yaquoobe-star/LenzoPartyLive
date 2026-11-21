import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, CheckCircle2, WifiOff } from 'lucide-react';

export interface PullToRefreshResult {
  offline?: boolean;
  message?: string;
}

interface PullToRefreshProps {
  onRefresh: () => Promise<PullToRefreshResult | void>;
  disabled?: boolean;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 64;
const MAX_PULL_DISTANCE = 108;

function getViewportScrollTop(): number {
  return (
    document.scrollingElement?.scrollTop ||
    window.scrollY ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    0
  );
}

/**
 * Checks whether the touch target or any scrollable ancestor is scrolled down
 * or belongs to an interactive/blocked element that shouldn't trigger Pull-to-Refresh.
 */
function canStartPullFromTarget(target: EventTarget | null, rootEl: HTMLElement | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  // Strictly require the viewport to be at the very top
  if (getViewportScrollTop() > 1) return false;

  let el: HTMLElement | null = target;
  while (el && el !== document.body && el !== document.documentElement) {
    // Explicit opt-out zones (e.g. reels index > 0, sliders, canvas, drag handles)
    if (el.dataset && el.dataset.ptrBlock === 'true') {
      return false;
    }

    // Do not hijack gestures starting inside form inputs or media controls
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') {
      return false;
    }
    if (el.isContentEditable) {
      return false;
    }

    // Never interfere with open modals/dialogs
    const role = el.getAttribute('role');
    if (role === 'dialog' || el.getAttribute('aria-modal') === 'true') {
      return false;
    }

    // Check if any inner vertically scrollable container is scrolled away from top
    if (el !== rootEl) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollableY =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 2;
      if (isScrollableY && el.scrollTop > 1) {
        return false;
      }

      // Skip full-screen fixed overlays (sheets/modals) so they scroll natively without interference
      if (style.position === 'fixed') {
        const rect = el.getBoundingClientRect();
        const isLargeOverlay = rect.width >= window.innerWidth * 0.7 && rect.height >= window.innerHeight * 0.5;
        if (isLargeOverlay && !el.dataset.ptrAllow) {
          return false;
        }
      }
    }

    el = el.parentElement;
  }

  return true;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  disabled = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'ready' | 'refreshing' | 'done' | 'offline'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const statusRef = useRef(status);
  statusRef.current = status;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isPullingActiveRef = useRef(false);
  const crossedThresholdRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const resetPullGesture = () => {
      isTrackingRef.current = false;
      isPullingActiveRef.current = false;
      crossedThresholdRef.current = false;
      if (pullDistanceRef.current !== 0 && statusRef.current !== 'refreshing') {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setStatus('idle');
      }
    };

    const handleWindowScroll = () => {
      if (getViewportScrollTop() > 1 && (isTrackingRef.current || isPullingActiveRef.current)) {
        resetPullGesture();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (statusRef.current === 'refreshing') return;

      if (!canStartPullFromTarget(e.target, el)) {
        isTrackingRef.current = false;
        isPullingActiveRef.current = false;
        return;
      }

      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      isTrackingRef.current = true;
      isPullingActiveRef.current = false;
      crossedThresholdRef.current = false;
    };

    // 100% PASSIVE listener: NEVER calls e.preventDefault() so native vertical/horizontal
    // scrolling stays hardware-accelerated at 60-120fps across Android WebView, iOS, and Web.
    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current || e.touches.length !== 1) return;
      if (statusRef.current === 'refreshing') return;

      if (getViewportScrollTop() > 1) {
        resetPullGesture();
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startXRef.current;
      const dy = currentY - startYRef.current;

      if (!isPullingActiveRef.current) {
        // User swiped up (scrolling down) -> release immediately
        if (dy < -3) {
          isTrackingRef.current = false;
          return;
        }
        // Horizontal gesture (tabs/carousels) -> release immediately
        if (Math.abs(dx) > Math.max(10, Math.abs(dy) * 0.55)) {
          isTrackingRef.current = false;
          return;
        }
        // Require a clear, deliberate downward pull past 24px while strictly at top
        if (dy < 24) {
          return;
        }
        isPullingActiveRef.current = true;
      }

      // If user reverses direction back upward, immediately dismiss indicator
      if (dy <= 10) {
        resetPullGesture();
        return;
      }

      const effectivePull = Math.max(0, dy - 18);
      const dampened = Math.min(MAX_PULL_DISTANCE, Math.round(effectivePull * 0.48));
      pullDistanceRef.current = dampened;
      setPullDistance(dampened);

      if (dampened >= PULL_THRESHOLD) {
        if (!crossedThresholdRef.current) {
          crossedThresholdRef.current = true;
          try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate(12);
            }
          } catch {
            // ignore unsupported haptics
          }
        }
        setStatus('ready');
      } else {
        crossedThresholdRef.current = false;
        setStatus('pulling');
      }
    };

    const handleTouchEnd = async () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      if (!isPullingActiveRef.current) return;
      isPullingActiveRef.current = false;

      const finalPull = pullDistanceRef.current;
      if (finalPull >= PULL_THRESHOLD && getViewportScrollTop() <= 2) {
        if (clearTimerRef.current) {
          clearTimeout(clearTimerRef.current);
          clearTimerRef.current = null;
        }
        setStatus('refreshing');
        setPullDistance(58);
        pullDistanceRef.current = 58;

        const startedAt = Date.now();
        let result: PullToRefreshResult | void;
        try {
          result = await onRefreshRef.current();
        } catch {
          result = { offline: !navigator.onLine };
        }

        const elapsed = Date.now() - startedAt;
        if (elapsed < 450) {
          await new Promise((r) => setTimeout(r, 450 - elapsed));
        }

        if (result && result.offline) {
          setStatus('offline');
          setStatusMessage(result.message || 'No internet connection');
        } else {
          setStatus('done');
          setStatusMessage((result && result.message) || 'Refreshed');
        }

        clearTimerRef.current = setTimeout(() => {
          setPullDistance(0);
          pullDistanceRef.current = 0;
          setStatus('idle');
          setStatusMessage('');
        }, 950);
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setStatus('idle');
      }
    };

    // ALL listeners strictly passive so browser scrolling is NEVER blocked
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('scroll', handleWindowScroll);
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [disabled]);

  const showIndicator = status !== 'idle' || pullDistance > 4;
  const progressRatio = Math.min(1, pullDistance / PULL_THRESHOLD);
  const rotationDeg = status === 'refreshing' ? 0 : Math.round(progressRatio * 220);

  return (
    <div ref={containerRef} className="relative w-full min-h-dvh-screen">
      {/* Floating Safe-Area Pull-to-Refresh Indicator (never transforms or blocks page scroll) */}
      {showIndicator && (
        <div
          className="fixed left-1/2 z-[180] pointer-events-none flex items-center justify-center"
          style={{
            top: 'calc(var(--safe-top, 0px) + 10px)',
            transform: `translate3d(-50%, ${Math.max(-44, Math.min(28, pullDistance - 38))}px, 0)`,
            opacity: status === 'pulling' ? Math.max(0.25, progressRatio) : 1,
            transition:
              status === 'pulling' || status === 'ready'
                ? 'opacity 80ms linear'
                : 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className={`px-3.5 py-2 rounded-full backdrop-blur-xl border shadow-2xl flex items-center gap-2 text-xs font-extrabold tracking-wide ${
              status === 'offline'
                ? 'bg-rose-950/95 border-rose-400/50 text-rose-100 shadow-rose-900/50'
                : status === 'done'
                ? 'bg-emerald-950/95 border-emerald-400/50 text-emerald-200 shadow-emerald-900/50'
                : status === 'ready' || status === 'refreshing'
                ? 'bg-[#1a0b33]/95 border-[#FA26A0]/60 text-white shadow-[0_8px_28px_rgba(243,40,213,0.35)]'
                : 'bg-[#140a26]/90 border-white/15 text-[#E3D8F5]'
            }`}
          >
            {status === 'offline' ? (
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            ) : status === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${
                  status === 'refreshing'
                    ? 'animate-spin text-[#FA26A0]'
                    : status === 'ready'
                    ? 'text-[#FFC84A]'
                    : 'text-[#C084FC]'
                }`}
                style={
                  status === 'refreshing'
                    ? undefined
                    : { transform: `rotate(${rotationDeg}deg)` }
                }
              />
            )}

            <span className="whitespace-nowrap">
              {status === 'pulling' && 'Pull to refresh'}
              {status === 'ready' && 'Release to refresh'}
              {status === 'refreshing' && 'Refreshing...'}
              {status === 'done' && (statusMessage || 'Refreshed')}
              {status === 'offline' && (statusMessage || 'No internet connection')}
            </span>
          </div>
        </div>
      )}

      {/* Wrapped Screen Content — zero CSS transform or overflow wrappers so native scrolling is never interrupted */}
      {children}
    </div>
  );
};
