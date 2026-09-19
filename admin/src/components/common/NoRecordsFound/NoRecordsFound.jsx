import PropTypes from "prop-types";

const NoRecordsFound = ({
  title = "No records found",
  description,
  compact = true,
  className = "",
}) => {
  const rootClass = [
    "no-records-found",
    compact ? "no-records-found--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite">
      <h2 className="no-records-found__title">{title}</h2>
      {description ? (
        <p className="no-records-found__description">{description}</p>
      ) : null}
    </div>
  );
};

NoRecordsFound.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default NoRecordsFound;
