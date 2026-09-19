import { Fragment, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

import { getCommonSettings } from "@src/app/state/actions/commonActions";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const PlainTextBlocks = ({ text }) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
};

const AboutUs = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.aboutUs) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <div className="about-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const aboutUs = commonSettings?.aboutUs || {};
  const sections = Array.isArray(aboutUs.sections) ? aboutUs.sections : [];
  const visibleSections = sections.filter(
    (sec) => sec?.heading?.trim() || sec?.description?.trim() || sec?.imageUrl,
  );
  const hasContent =
    aboutUs.title?.trim() ||
    aboutUs.intro?.trim() ||
    visibleSections.length > 0;

  if (!hasContent) {
    return (
      <div className="about-us-page">
        <Container>
          <NoRecordsFound
            compact={false}
            description="About Us content is being updated. Please check back soon."
          />
        </Container>
      </div>
    );
  }

  const pageTitle = aboutUs.title?.trim() || "About Us";

  return (
    <div className="about-us-page">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="about-us-hero">
        <Container>
          <div className="about-us-hero__inner">
            <span className="about-us-hero__eyebrow">Our story</span>
            <h1 className="about-us-hero__title">{pageTitle}</h1>
            {aboutUs.intro?.trim() ? (
              <p className="about-us-hero__intro">{aboutUs.intro.trim()}</p>
            ) : null}
          </div>
        </Container>
      </section>

      <section className="about-us-sections">
        <Container>
          {visibleSections.map((sec, index) => {
            const reverse = index % 2 === 1;
            const hasImage = Boolean(sec.imageUrl);
            const hasText =
              Boolean(sec.heading?.trim()) || Boolean(sec.description?.trim());

            return (
              <article
                key={sec.id || `about-section-${index}`}
                className={`about-us-block${reverse ? " about-us-block--reverse" : ""}`}
              >
                <Row className="align-items-center g-4 g-lg-5">
                  {hasImage ? (
                    <Col xs={12} lg={hasText ? 6 : 12}>
                      <div className="about-us-block__media">
                        <img
                          src={sec.imageUrl}
                          alt={sec.heading?.trim() || `Section ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    </Col>
                  ) : null}
                  {hasText ? (
                    <Col xs={12} lg={hasImage ? 6 : 12}>
                      <div className="about-us-block__content">
                        {sec.heading?.trim() ? (
                          <h2 className="about-us-block__heading">
                            {sec.heading.trim()}
                          </h2>
                        ) : null}
                        {sec.description?.trim() ? (
                          <div className="about-us-block__text">
                            <PlainTextBlocks text={sec.description} />
                          </div>
                        ) : null}
                      </div>
                    </Col>
                  ) : null}
                </Row>
              </article>
            );
          })}
        </Container>
      </section>
    </div>
  );
};

AboutUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(AboutUs);
