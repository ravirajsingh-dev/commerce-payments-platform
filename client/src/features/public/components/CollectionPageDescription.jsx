import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";

import { stripHtmlToText } from "@src/utils/collectionPageHelpers";

const CollectionPageDescription = ({ description }) => {
  const text = useMemo(() => stripHtmlToText(description), [description]);
  const [expanded, setExpanded] = useState(false);
  const [clampLines, setClampLines] = useState(false);
  const [limits, setLimits] = useState(null);
  const textRef = useRef(null);
  const viewportRef = useRef(null);
  const bodyId = useId();

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el || !text) {
      setLimits(null);
      return;
    }

    el.classList.remove("collection-page__desc-text--clamp");
    const full = el.scrollHeight;

    el.classList.add("collection-page__desc-text--clamp");
    const collapsed = el.getBoundingClientRect().height;
    el.classList.remove("collection-page__desc-text--clamp");

    setLimits({
      collapsed,
      full,
      canToggle: full > collapsed + 2,
    });
  }, [text]);

  useEffect(() => {
    setExpanded(false);
    setClampLines(false);
    setLimits(null);
  }, [text]);

  useEffect(() => {
    if (limits && !expanded) {
      setClampLines(true);
    }
    // Only re-clamp on remeasure while collapsed; expand/collapse uses transition handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limits]);

  useLayoutEffect(() => {
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  if (!text) return null;

  const canToggle = limits?.canToggle ?? false;
  const maxHeight = limits
    ? expanded
      ? limits.full
      : limits.collapsed
    : null;

  const handleToggle = () => {
    if (expanded) {
      setClampLines(false);
      requestAnimationFrame(() => setExpanded(false));
      return;
    }
    setClampLines(false);
    setExpanded(true);
  };

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== "max-height") return;
    if (!expanded) setClampLines(true);
  };

  return (
    <div className="collection-page__desc">
      <div
        ref={viewportRef}
        id={bodyId}
        className={[
          "collection-page__desc-viewport",
          limits ? "collection-page__desc-viewport--ready" : "",
          expanded ? "collection-page__desc-viewport--expanded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          maxHeight != null ? { maxHeight: `${maxHeight}px` } : undefined
        }
        onTransitionEnd={handleTransitionEnd}
      >
        <p
          ref={textRef}
          className={[
            "collection-page__desc-text",
            clampLines && canToggle ? "collection-page__desc-text--clamp" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {text}
        </p>
      </div>

      {canToggle ? (
        <div className="collection-page__desc-toggle-wrap">
          <button
            type="button"
            className="collection-page__desc-toggle"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={bodyId}
          >
            {expanded ? "Read Less" : "Read More"}
          </button>
        </div>
      ) : null}
    </div>
  );
};

CollectionPageDescription.propTypes = {
  description: PropTypes.string,
};

export default CollectionPageDescription;
