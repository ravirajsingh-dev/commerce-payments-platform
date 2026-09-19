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

const AppBreadCrumb = ({ breadcrumbs, title }) => {
  const visibleItems = (Array.isArray(breadcrumbs) ? breadcrumbs : [])
    .map(normalizeCrumb)
    .filter(({ label }) => label);

  if (visibleItems.length === 0) return null;

  const pageTitle =
    title != null && String(title).trim() !== ""
      ? String(title).trim()
      : visibleItems[visibleItems.length - 1].label;

  return (
    <header className="common-breadcrumb">
      <div className="common-breadcrumb__inner">
        <h1 className="common-breadcrumb__title">{pageTitle}</h1>
        <nav className="common-breadcrumb__trail" aria-label="Breadcrumb">
          {visibleItems.map(({ label, link }, index) => {
            const isLast = index === visibleItems.length - 1;
            const key = `${label}-${index}`;

            return (
              <span key={key} className="common-breadcrumb__segment">
                {index > 0 ? (
                  <span className="common-breadcrumb__sep" aria-hidden>
                    ||
                  </span>
                ) : null}
                {!isLast && link ? (
                  <Link to={link} className="common-breadcrumb__link">
                    {label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? "common-breadcrumb__current"
                        : "common-breadcrumb__text"
                    }
                    aria-current={isLast ? "page" : undefined}
                  >
                    {label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

AppBreadCrumb.propTypes = {
  title: PropTypes.string,
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
