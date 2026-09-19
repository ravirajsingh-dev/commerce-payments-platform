import PropTypes from "prop-types";
import { Carousel, Container } from "react-bootstrap";

const ShowcaseSlider = ({ showcase }) => {
  const getImageUrl = (url = "") => encodeURI(String(url || "").trim());
  if (!showcase || !Array.isArray(showcase.images) || showcase.images.length === 0) {
    return null;
  }

  const imageItems = showcase.images.filter((img) => img?.url);
  if (imageItems.length === 0) return null;

  const hasMultiple = imageItems.length > 1;
  const shouldAutoPlay = hasMultiple;

  return (
    <section className="showcase-slider fade-in-section">
      <Container fluid className="px-0">
        <div className="showcase-slider__head text-center">
          <h2 className="section-head__title">{showcase.heading}</h2>
          {showcase.description ? (
            <p className="showcase-slider__description">{showcase.description}</p>
          ) : null}
        </div>
        <Carousel
          fade
          controls={hasMultiple}
          indicators={false}
          interval={shouldAutoPlay ? 4500 : null}
          pause={hasMultiple ? "hover" : false}
        >
          {imageItems.map((image, index) => (
            <Carousel.Item key={image.publicId || image.url || index}>
              <div
                className="showcase-slider__image"
                style={
                  image.url
                    ? {
                        backgroundImage: `linear-gradient(120deg, rgba(0,0,0,.2), rgba(0,0,0,.4)), url(${getImageUrl(image.url)})`,
                      }
                    : undefined
                }
              />
            </Carousel.Item>
          ))}
        </Carousel>
      </Container>
    </section>
  );
};

ShowcaseSlider.propTypes = {
  showcase: PropTypes.shape({
    heading: PropTypes.string,
    description: PropTypes.string,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        publicId: PropTypes.string,
      }),
    ),
  }),
};

ShowcaseSlider.defaultProps = {
  showcase: null,
};

export default ShowcaseSlider;
