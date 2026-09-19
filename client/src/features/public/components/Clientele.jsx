import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { Carousel, Col, Container, Row } from "react-bootstrap";

const VISIBLE_DESKTOP = 3;
const MD_BREAKPOINT_PX = 768;
/** 10s so users can read testimonials; use 5000 for faster rotation */
const INTERVAL_MS = 10000;

const Clientele = ({ items }) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MD_BREAKPOINT_PX : false,
  );

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < MD_BREAKPOINT_PX);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const safeItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((item) => item?.name || item?.note || item?.image)
        : [],
    [items],
  );

  const n = safeItems.length;
  const getImageUrl = (url = "") => encodeURI(String(url || "").trim());
  const perSlide = isMobile ? 1 : VISIBLE_DESKTOP;

  const slides = useMemo(() => {
    if (n === 0) return [];
    if (n <= perSlide) return [safeItems];
    if (perSlide === 1) {
      return safeItems.map((item) => [item]);
    }
    return Array.from({ length: n }, (_, start) =>
      Array.from({ length: perSlide }, (_, j) => safeItems[(start + j) % n]),
    );
  }, [n, perSlide, safeItems]);

  const hasMultipleSlides = slides.length > 1;

  if (n === 0) return null;

  return (
    <section className="home-clientele fade-in-section">
      <Container>
        <div className="home-clientele__head text-center">
          <h2 className="home-clientele__title">OUR CLIENTELE</h2>
          <p className="home-clientele__subtitle">At RRJ we celebrate lifelong relationships</p>
        </div>

        <Carousel
          key={`clientele-${isMobile ? "m" : "d"}-${n}`}
          className="home-clientele__carousel-bs"
          fade
          controls={false}
          indicators={hasMultipleSlides}
          interval={hasMultipleSlides ? INTERVAL_MS : null}
          pause={hasMultipleSlides ? "hover" : false}
          wrap={hasMultipleSlides}
          touch={hasMultipleSlides}
          keyboard={hasMultipleSlides}
        >
          {slides.map((slide, slideIndex) => (
            <Carousel.Item key={`clientele-slide-${slideIndex}`}>
              <Row className="g-4 justify-content-center home-clientele__row">
                {slide.map((item, j) => (
                  <Col xs={12} md={6} lg={4} key={`${slideIndex}-${item._id || item.name}-${j}`}>
                    <article className="home-clientele__card-wrap">
                      <div className="home-clientele__card">
                        <span className="home-clientele__quote">"</span>
                        <p className="home-clientele__note" title={item.note || ""}>
                          {item.note}
                        </p>
                      </div>
                      <div className="home-clientele__profile">
                        <div
                          className="home-clientele__avatar"
                          style={
                            item.image
                              ? { backgroundImage: `url(${getImageUrl(item.image)})` }
                              : undefined
                          }
                        />
                        <h3 className="home-clientele__name">{item.name}</h3>
                      </div>
                    </article>
                  </Col>
                ))}
              </Row>
            </Carousel.Item>
          ))}
        </Carousel>
      </Container>
    </section>
  );
};

Clientele.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      note: PropTypes.string,
    }),
  ),
};

Clientele.defaultProps = {
  items: [],
};

export default Clientele;
