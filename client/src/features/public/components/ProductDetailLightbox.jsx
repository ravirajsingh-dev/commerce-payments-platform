import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaMinus,
  FaPlus,
  FaTimes,
} from "react-icons/fa";

const ZOOM_LEVELS = [1, 1.35, 1.75, 2.25];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Product image lightbox: full image (contain), zoom + drag to pan, backdrop tap to close, theme-aligned chrome.
 */
const ProductDetailLightbox = ({
  show,
  onHide,
  images = [],
  activeIndex,
  onSelectIndex,
  title = "",
  autoFullscreenOnOpen = false,
  onConsumedAutoFullscreen,
}) => {
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const boundsRef = useRef({ maxX: 0, maxY: 0 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const [zoomIdx, setZoomIdx] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState(false);
  const [imgDragging, setImgDragging] = useState(false);
  const [fsAttempted, setFsAttempted] = useState(false);
  const leavingRef = useRef(false);
  const closeCommittedRef = useRef(false);

  const count = images.length;
  const safeIndex = count ? Math.min(Math.max(activeIndex, 0), count - 1) : 0;
  const current = images[safeIndex];
  const url = current?.url || "";

  const scale = ZOOM_LEVELS[zoomIdx];

  const recomputeBounds = useCallback(() => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img || scale <= 1) {
      boundsRef.current = { maxX: 0, maxY: 0 };
      return;
    }
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const iw = img.offsetWidth;
    const ih = img.offsetHeight;
    const sw = iw * scale;
    const sh = ih * scale;
    boundsRef.current = {
      maxX: Math.max(0, (sw - vpW) / 2),
      maxY: Math.max(0, (sh - vpH) / 2),
    };
  }, [scale]);

  useLayoutEffect(() => {
    recomputeBounds();
  }, [recomputeBounds, url, show, zoomIdx]);

  useEffect(() => {
    if (!show || !url) return undefined;
    const ro = new ResizeObserver(() => {
      recomputeBounds();
      setPan((p) => {
        const { maxX, maxY } = boundsRef.current;
        return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
      });
    });
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (vp) ro.observe(vp);
    if (img) ro.observe(img);
    return () => ro.disconnect();
  }, [show, url, recomputeBounds]);

  const requestClose = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
  }, [leaving]);

  const finishClose = useCallback(() => {
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    onHide();
  }, [onHide]);

  useEffect(() => {
    leavingRef.current = leaving;
  }, [leaving]);

  useEffect(() => {
    if (!leaving) return undefined;
    const tid = window.setTimeout(() => {
      if (closeCommittedRef.current) return;
      closeCommittedRef.current = true;
      finishClose();
    }, 360);
    return () => window.clearTimeout(tid);
  }, [leaving, finishClose]);

  const onRootTransitionEnd = useCallback(
    (e) => {
      if (e.target !== rootRef.current) return;
      if (e.propertyName !== "opacity") return;
      if (!leavingRef.current || closeCommittedRef.current) return;
      closeCommittedRef.current = true;
      finishClose();
    },
    [finishClose],
  );

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
    onSelectIndex((safeIndex - 1 + count) % count);
  }, [count, onSelectIndex, safeIndex]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
    onSelectIndex((safeIndex + 1) % count);
  }, [count, onSelectIndex, safeIndex]);

  const zoomIn = useCallback(() => {
    setZoomIdx((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIdx((i) => {
      const next = Math.max(i - 1, 0);
      return next;
    });
  }, []);

  useEffect(() => {
    if (zoomIdx === 0) setPan({ x: 0, y: 0 });
  }, [zoomIdx]);

  useEffect(() => {
    setZoomIdx(0);
    setPan({ x: 0, y: 0 });
  }, [safeIndex, url]);

  useEffect(() => {
    if (show) {
      setLeaving(false);
      closeCommittedRef.current = false;
    }
  }, [show]);

  const close = useCallback(() => {
    requestClose();
  }, [requestClose]);

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerMovePan = useCallback((e) => {
    if (!dragRef.current.active) return;
    const d = dragRef.current;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const { maxX, maxY } = boundsRef.current;
    setPan({
      x: clamp(d.origX + dx, -maxX, maxX),
      y: clamp(d.origY + dy, -maxY, maxY),
    });
  }, []);

  const endPan = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setImgDragging(false);
    window.removeEventListener("pointermove", onPointerMovePan);
    window.removeEventListener("pointerup", endPan);
    window.removeEventListener("pointercancel", endPan);
  }, [onPointerMovePan]);

  const onPointerDownPan = useCallback(
    (e) => {
      if (scale <= 1) return;
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: pan.x,
        origY: pan.y,
      };
      setImgDragging(true);
      recomputeBounds();
      window.addEventListener("pointermove", onPointerMovePan);
      window.addEventListener("pointerup", endPan);
      window.addEventListener("pointercancel", endPan);
    },
    [scale, pan.x, pan.y, onPointerMovePan, endPan, recomputeBounds],
  );

  useEffect(() => {
    if (!show) {
      setFsAttempted(false);
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, close, goPrev, goNext]);

  useEffect(() => {
    if (!show) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  useEffect(() => {
    if (!show || !autoFullscreenOnOpen || fsAttempted) return undefined;
    const id = window.requestAnimationFrame(() => {
      const el = rootRef.current;
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      setFsAttempted(true);
      onConsumedAutoFullscreen?.();
    });
    return () => window.cancelAnimationFrame(id);
  }, [show, autoFullscreenOnOpen, fsAttempted, onConsumedAutoFullscreen]);

  useEffect(() => () => endPan(), [endPan]);

  if (!show || !url) return null;

  const node = (
    <div
      ref={rootRef}
      className={`product-detail-lightbox${leaving ? " product-detail-lightbox--leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Images: ${title}` : "Product images"}
      onTransitionEnd={onRootTransitionEnd}
    >
      <header
        className="product-detail-lightbox__top"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="product-detail-lightbox__counter">
          {safeIndex + 1} / {count}
        </span>
        <div className="product-detail-lightbox__toolbar">
          <button
            type="button"
            className="product-detail-lightbox__tool"
            onClick={zoomOut}
            disabled={zoomIdx <= 0}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <FaMinus aria-hidden />
          </button>
          <button
            type="button"
            className="product-detail-lightbox__tool"
            onClick={zoomIn}
            disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <FaPlus aria-hidden />
          </button>
          <button
            type="button"
            className="product-detail-lightbox__tool"
            onClick={toggleFullscreen}
            title="Full screen"
            aria-label="Full screen"
          >
            <FaExpand aria-hidden />
          </button>
          <button
            type="button"
            className="product-detail-lightbox__tool product-detail-lightbox__tool--close"
            onClick={close}
            title="Close"
            aria-label="Close"
          >
            <FaTimes aria-hidden />
          </button>
        </div>
      </header>

      <div className="product-detail-lightbox__mid">
        <button
          type="button"
          className="product-detail-lightbox__underlay"
          aria-label="Close viewer"
          onClick={requestClose}
        />

        <div className="product-detail-lightbox__stage">
          <div
            ref={viewportRef}
            className={`product-detail-lightbox__viewport${
              scale > 1
                ? " product-detail-lightbox__viewport--zoomed product-detail-lightbox__viewport--pannable"
                : ""
            }${imgDragging ? " product-detail-lightbox__viewport--dragging" : ""}`}
            onPointerDown={onPointerDownPan}
          >
            <div
              className="product-detail-lightbox__pan"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <img
                ref={imgRef}
                className={`product-detail-lightbox__img${imgDragging ? " product-detail-lightbox__img--dragging" : ""}`}
                src={url}
                alt=""
                draggable={false}
                style={{
                  transform: `scale(${scale})`,
                }}
                onLoad={recomputeBounds}
              />
            </div>
          </div>
        </div>
      </div>

      {count > 1 ? (
        <button
          type="button"
          className="product-detail-lightbox__side product-detail-lightbox__side--prev"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous image"
        >
          <FaArrowLeft aria-hidden />
        </button>
      ) : null}

      {count > 1 ? (
        <button
          type="button"
          className="product-detail-lightbox__side product-detail-lightbox__side--next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next image"
        >
          <FaArrowRight aria-hidden />
        </button>
      ) : null}
    </div>
  );

  return createPortal(node, document.body);
};

export default ProductDetailLightbox;
