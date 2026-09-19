import { connect } from "react-redux";
import PropTypes from "prop-types";

const DefaultFooter = ({ common: { commonSettings } }) => {
  const name = commonSettings?.abbreviation || "";

  return (
    <section
      role="contentinfo"
      aria-label="Copyright"
      className="store-footer-legal-bar"
    >
      <hr className="store-footer-section-rule" />
      <p className="store-footer-copyright">
        © {new Date().getFullYear()}{" "}
        {name && <span className="store-footer-copyright-brand">{name}</span>}
        {name && ". "}All rights reserved.
      </p>
    </section>
  );
};

DefaultFooter.propTypes = {
  common: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps)(DefaultFooter);
