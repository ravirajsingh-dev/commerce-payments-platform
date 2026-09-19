import { useState, useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaAngleDoubleUp } from "react-icons/fa";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import { getCommonSettings } from "@src/app/state/actions/commonActions";
import CopyIcon from "@src/components/common/CopyIcon";
import SocialIcons from "@src/components/common/SocialIcons/SocialIcons";
import { useStoreCategories } from "@src/hooks/useStoreCategories";

const parsePhones = (raw) =>
  raw
    ? raw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const buildPhoneLines = (contactUsPage) => {
  const lines = [];
  const primary = contactUsPage?.phone?.trim();
  const secondary = contactUsPage?.secondaryPhone?.trim();
  if (primary) lines.push(...parsePhones(primary));
  if (secondary) lines.push(...parsePhones(secondary));
  return lines;
};

const Footer = ({
  common: { commonSettings, loadingCommonSettings },
  getCommonSettings,
}) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { categories, loading: categoriesLoading } = useStoreCategories();

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fullName = commonSettings?.name?.trim() || "";
  const contactUsPage = commonSettings?.contactUsPage || {};
  const email = contactUsPage.email?.trim() || "";
  const address = contactUsPage.address?.trim() || "";
  const phoneLines = buildPhoneLines(contactUsPage);
  const socialMedia = commonSettings?.socialMedia || {};

  if (loadingCommonSettings) {
    return (
      <footer className="store-footer store-footer--loading">
        <div
          className="store-footer-loading"
          aria-busy="true"
          aria-live="polite"
        >
          <CommonSpinner size="md" />
        </div>
      </footer>
    );
  }

  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        <div className="store-footer-grid">
          <nav className="store-footer-col" aria-label="Customer services">
            <h2 className="store-footer-col-heading">Customer services</h2>
            <ul className="store-footer-col-list">
              <li>
                <Link to="/about-us" className="store-footer-link">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="store-footer-link">
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="store-footer-col" aria-label="Delivery and policies">
            <h2 className="store-footer-col-heading">Delivery</h2>
            <ul className="store-footer-col-list">
              <li>
                <Link to="/returns-and-refunds" className="store-footer-link">
                  Returns &amp; Refunds
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="store-footer-link">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="store-footer-link">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="store-footer-col" aria-label="Shopping">
            <h2 className="store-footer-col-heading">Shopping</h2>
            <ul className="store-footer-col-list">
              {categoriesLoading ? (
                <li className="store-footer-shopping-loading">
                  <CommonSpinner size="sm" />
                </li>
              ) : (
                categories
                  .filter((category) => String(category.slug || "").trim())
                  .map((category) => {
                    const categorySlug = String(category.slug || "").trim();
                    return (
                      <li key={categorySlug}>
                        <Link
                          to={`/category/${categorySlug}`}
                          className="store-footer-link"
                        >
                          {category.name || categorySlug}
                        </Link>
                      </li>
                    );
                  })
              )}
            </ul>
          </nav>

          <address className="store-footer-col store-footer-col--connect">
            <h2 className="store-footer-col-heading">Connect</h2>
            {fullName ? (
              <p className="store-footer-connect-name">{fullName}</p>
            ) : null}

            {phoneLines.length > 0 ? (
              <ul className="store-footer-phone-list">
                {phoneLines.map((phone, i) => {
                  const tel = phone.replace(/[^\d+]/g, "");
                  return (
                    <li key={`${phone}-${i}`} className="store-footer-copy-row">
                      <a
                        href={tel ? `tel:${tel}` : undefined}
                        className="store-footer-link store-footer-link--plain"
                      >
                        {phone}
                      </a>
                      <CopyIcon
                        textToCopy={phone}
                        iconSize={16}
                        className="ms-1 align-middle"
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {email ? (
              <p className="store-footer-connect-line store-footer-copy-row">
                <a
                  href={`mailto:${email}`}
                  className="store-footer-link store-footer-link--plain"
                >
                  {email}
                </a>
                <CopyIcon
                  textToCopy={email}
                  iconSize={16}
                  className="ms-1 align-middle"
                />
              </p>
            ) : null}

            {address ? (
              <p className="store-footer-connect-line store-footer-connect-address store-footer-copy-row">
                <span className="store-footer-address-text">{address}</span>
                <CopyIcon
                  textToCopy={address}
                  iconSize={16}
                  className="ms-1 align-middle flex-shrink-0"
                />
              </p>
            ) : null}

            <div className="store-footer-social-bottom">
              <SocialIcons socialMedia={socialMedia} size="small" />
            </div>
          </address>
        </div>
      </div>

      {showBackToTop ? (
        <button
          type="button"
          className="store-footer-back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <FaAngleDoubleUp />
        </button>
      ) : null}
    </footer>
  );
};

Footer.propTypes = {
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(Footer);
