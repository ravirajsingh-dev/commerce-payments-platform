import PropTypes from "prop-types";

const sizeClassMap = {
  sm: "common-spinner--sm",
  md: "common-spinner--md",
  lg: "common-spinner--lg",
};

const CommonSpinner = ({ className = "", size = "md", message = "" }) => {
  const sizeClass = sizeClassMap[size] || sizeClassMap.md;

  return (
    <div
      className={`common-spinner ${sizeClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message || "Loading content"}
    >
      <div className="common-spinner__ring" aria-hidden="true" />
      {message ? <p className="common-spinner__message">{message}</p> : null}
    </div>
  );
};

CommonSpinner.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  message: PropTypes.string,
};

export default CommonSpinner;
