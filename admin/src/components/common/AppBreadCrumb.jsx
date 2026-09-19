import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/**
 * Normalizes crumb to { label, link } format.
 * Supports both: { label, link } and { name, path }
 */
const normalizeCrumb = (crumb) => {
  if (!crumb || typeof crumb !== "object") return { label: "", link: null };

  return {
    label: crumb.label ?? crumb.name ?? "",
    link: crumb.link ?? crumb.path ?? null,
  };
};

const AppBreadCrumb = ({ breadcrumbs }) => {
  const visibleItems = (Array.isArray(breadcrumbs) ? breadcrumbs : [])
    .map(normalizeCrumb)
    .filter(({ label }) => label);

  return (
    <section className="common-breadcrumb common-breadcrumb--container">
      <div className="common-breadcrumb__list">
        <ul>
          {visibleItems.map(({ label, link }, index) => {
            const isLast = index === visibleItems.length - 1;

            return (
              <li key={`${label}-${index}`}>
                {link && !isLast ? (
                  <Link to={link}>{label}</Link>
                ) : (
                  <span>{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

AppBreadCrumb.propTypes = {
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      link: PropTypes.string,
      name: PropTypes.string,
      path: PropTypes.string,
    }),
  ),
};

export default AppBreadCrumb;
