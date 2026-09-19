import { Fragment, useEffect } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";

import { getCommonSettings } from "@src/app/state/actions/commonActions";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import SocialIcons from "@src/components/common/SocialIcons/SocialIcons";
import CopyIcon from "@src/components/common/CopyIcon";

const formatTel = (value) => String(value || "").replace(/\s/g, "");

const MultilineText = ({ text }) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  return trimmed.split("\n").map((line, i, arr) => (
    <Fragment key={i}>
      {line}
      {i < arr.length - 1 ? <br /> : null}
    </Fragment>
  ));
};

const CopyableRow = ({ href, text, children, className = "" }) => (
  <span className={`contact-us-copy-row ${className}`.trim()}>
    {href ? (
      <a href={href} className="contact-us-link">
        {children ?? text}
      </a>
    ) : (
      <span className="contact-us-text">{children ?? text}</span>
    )}
    <CopyIcon textToCopy={text} iconSize={18} className="contact-us-copy-btn" />
  </span>
);

const ContactChannel = ({ icon: Icon, label, children }) => (
  <div className="contact-us-channel">
    <div className="contact-us-channel__icon" aria-hidden="true">
      <Icon />
    </div>
    <div className="contact-us-channel__content">
      <span className="contact-us-channel__label">{label}</span>
      <div className="contact-us-channel__value">{children}</div>
    </div>
  </div>
);

const ContactUs = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  useEffect(() => {
    if (!commonSettings?.contactUsPage) {
      getCommonSettings();
    }
  }, [getCommonSettings, commonSettings]);

  if (loadingCommonSettings) {
    return (
      <div className="contact-us-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  const contactUsPage = commonSettings?.contactUsPage || {};
  const socialMedia = commonSettings?.socialMedia || {};

  const phone = contactUsPage.phone || commonSettings?.contactUs || "";
  const secondaryPhone = contactUsPage.secondaryPhone || "";
  const email = contactUsPage.email || commonSettings?.email || "";
  const address = contactUsPage.address || commonSettings?.address || "";
  const businessHours = contactUsPage.businessHours || "";

  const hasContent =
    phone || email || address || businessHours || secondaryPhone;

  const hasSocial =
    socialMedia.instagram ||
    socialMedia.facebook ||
    socialMedia.youtube ||
    socialMedia.zoomMeeting;

  const pageTitle = contactUsPage.title?.trim() || "Contact Us";
  const intro =
    contactUsPage.intro?.trim() ||
    "We would love to hear from you. Reach out for bespoke appointments, orders, or any questions about our collections.";

  if (!hasContent) {
    return (
      <div className="contact-us-page">
        <Container>
          <NoRecordsFound
            compact={false}
            description="Contact information is being updated. Please check back soon."
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="contact-us-page">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="contact-us-hero">
        <Container>
          <div className="contact-us-hero__inner">
            <span className="contact-us-hero__eyebrow">Get in touch</span>
            <h1 className="contact-us-hero__title">{pageTitle}</h1>
            <p className="contact-us-hero__intro">{intro}</p>
          </div>
        </Container>
      </section>

      <section className="contact-us-body">
        <Container>
          <div className="contact-us-panel">
            <div className="contact-us-channels">
              {phone ? (
                <ContactChannel icon={FaPhone} label="Phone">
                  <CopyableRow
                    href={`tel:${formatTel(phone)}`}
                    text={phone}
                  />
                  {secondaryPhone ? (
                    <CopyableRow
                      href={`tel:${formatTel(secondaryPhone)}`}
                      text={secondaryPhone}
                      className="contact-us-copy-row--secondary"
                    />
                  ) : null}
                </ContactChannel>
              ) : null}

              {email ? (
                <ContactChannel icon={FaEnvelope} label="Email">
                  <CopyableRow href={`mailto:${email}`} text={email} />
                </ContactChannel>
              ) : null}

              {address ? (
                <ContactChannel icon={FaMapMarkerAlt} label="Visit us">
                  <CopyableRow text={address.trim()}>
                    <MultilineText text={address} />
                  </CopyableRow>
                </ContactChannel>
              ) : null}

              {businessHours ? (
                <ContactChannel icon={FaClock} label="Hours">
                  <span className="contact-us-text">
                    <MultilineText text={businessHours} />
                  </span>
                </ContactChannel>
              ) : null}
            </div>

            {hasSocial ? (
              <aside className="contact-us-social">
                <div className="contact-us-social__divider" aria-hidden="true" />
                <h2 className="contact-us-social__title">Follow us</h2>
                <SocialIcons
                  socialMedia={socialMedia}
                  size="medium"
                  className="contact-us-social-icons"
                />
              </aside>
            ) : null}
          </div>
        </Container>
      </section>
    </div>
  );
};

ContactUs.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(ContactUs);
