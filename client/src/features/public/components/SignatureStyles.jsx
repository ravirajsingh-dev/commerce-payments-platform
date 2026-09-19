import { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";

const SignatureStyles = ({ styles }) => {
  const scrollerRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const getImageUrl = (url = "") => encodeURI(String(url || "").trim());
  if (!Array.isArray(styles) || styles.length === 0) return null;
  const shouldAutoScroll = styles.length >= 6;
  const renderStyles = useMemo(
    () => (shouldAutoScroll ? [...styles, ...styles] : styles),
    [styles, shouldAutoScroll],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !shouldAutoScroll) return undefined;

    let animationFrameId;
    let isPaused = false;
    const speed = 0.45;
    const loopPoint = scroller.scrollWidth / 2;

    const pauseTemporarily = () => {
      isPaused = true;
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
      resumeTimeoutRef.current = window.setTimeout(() => {
        isPaused = false;
      }, 1200);
    };

    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
    };

    const handlePointerDown = () => {
      pauseTemporarily();
    };

    const handleWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
      pauseTemporarily();
    };

    scroller.addEventListener("mouseenter", handleMouseEnter);
    scroller.addEventListener("mouseleave", handleMouseLeave);
    scroller.addEventListener("pointerdown", handlePointerDown);
    scroller.addEventListener("wheel", handleWheel, { passive: false });

    const animate = () => {
      if (scroller.scrollLeft >= loopPoint) {
        scroller.scrollLeft -= loopPoint;
      }

      if (!isPaused) {
        scroller.scrollLeft += speed;
      }

      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      scroller.removeEventListener("mouseenter", handleMouseEnter);
      scroller.removeEventListener("mouseleave", handleMouseLeave);
      scroller.removeEventListener("pointerdown", handlePointerDown);
      scroller.removeEventListener("wheel", handleWheel);
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [shouldAutoScroll]);

  return (
    <section className="signature-styles fade-in-section">
      <Container>
        <div className="signature-styles__head text-center">
          <h2 className="signature-styles__title">Signature Styles</h2>
          <p className="signature-styles__tagline">
            Experience the RRJ bespoke styles.
          </p>
        </div>

        <div className="signature-styles__grid" ref={scrollerRef}>
          {renderStyles.map((item, index) => (
            <Link
              to={item.routePath}
              className="signature-styles__item"
              key={`${item._id || item.routePath}-${index}`}
              aria-hidden={shouldAutoScroll && index >= styles.length}
              tabIndex={shouldAutoScroll && index >= styles.length ? -1 : 0}
            >
              <div className="signature-styles__media">
                <span
                  className="signature-styles__media-fallback"
                  style={
                    item.image
                      ? { backgroundImage: `url(${getImageUrl(item.image)})` }
                      : undefined
                  }
                />
                <span className="signature-styles__media-overlay" />
              </div>
              <div className="signature-styles__content">
                <h3>{item.title}</h3>
                <p className="signature-styles__subtitle">{item.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};

SignatureStyles.propTypes = {
  styles: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string,
      image: PropTypes.string.isRequired,
      routePath: PropTypes.string.isRequired,
    }),
  ),
};

SignatureStyles.defaultProps = {
  styles: [],
};

export default SignatureStyles;
