import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Carousel, Container } from "react-bootstrap";
import { Link } from "react-router-dom";

const slideHeading = (slide) => slide?.heading ?? slide?.title ?? "";
const slideShortDesc = (slide) => slide?.shortDesc ?? slide?.subtitle ?? "";

const HeroSlider = ({ slides }) => {
  const getImageUrl = (url = "") => encodeURI(String(url || "").trim());
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const setViewport = () => setIsMobile(window.innerWidth < 768);
    setViewport();
    window.addEventListener("resize", setViewport);
    return () => window.removeEventListener("resize", setViewport);
  }, []);

  if (!Array.isArray(slides) || slides.length === 0) return null;
  const hasMultipleSlides = slides.length > 1;
  const shouldAutoPlay = hasMultipleSlides;

  return (
    <section className="home-hero-slider fade-in-section is-visible">
      <Carousel
        controls={hasMultipleSlides}
        indicators={false}
        interval={shouldAutoPlay ? 5000 : null}
        fade
        pause={hasMultipleSlides ? "hover" : false}
      >
        {slides.map((slide) => {
          const backgroundImage = getImageUrl(
            isMobile
              ? slide.mobileImage || slide.image
              : slide.image || slide.mobileImage,
          );
          return (
            <Carousel.Item key={slide._id || slide.image}>
              <div
                className="home-hero"
                style={
                  backgroundImage
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.7)), url(${backgroundImage})`,
                      }
                    : undefined
                }
              >
                <div className="home-hero__overlay" />
                <Container>
                  <div className="home-hero__content">
                    <h1 className="home-hero__title">{slideHeading(slide)}</h1>
                    <p className="home-hero__subtitle">
                      {slideShortDesc(slide)}
                    </p>
                    {slide.buttonText && (
                      <Link
                        to={slide.buttonLink || "#"}
                        className="btn btn-sm btn--theme home-hero__btn"
                      >
                        {slide.buttonText}
                      </Link>
                    )}
                  </div>
                </Container>
              </div>
            </Carousel.Item>
          );
        })}
      </Carousel>
    </section>
  );
};

HeroSlider.propTypes = {
  slides: PropTypes.arrayOf(PropTypes.object),
};

HeroSlider.defaultProps = {
  slides: [],
};

export default HeroSlider;
