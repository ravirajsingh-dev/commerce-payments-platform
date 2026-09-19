import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";

const ShopMegaMenu = ({ columns, loading, onNavigate }) => {
  if (loading) {
    return (
      <div className="site-header__mega site-header__mega--loading">
        <CommonSpinner size="sm" />
      </div>
    );
  }

  if (!columns?.length) {
    return (
      <div className="site-header__mega site-header__mega--empty">
        <p className="site-header__mega-empty">
          Collections will appear here once products are published.
        </p>
      </div>
    );
  }

  const colCount = Math.min(Math.max(columns.length, 1), 3);

  return (
    <div className="site-header__mega" role="region" aria-label="Shop collections">
      <div
        className="site-header__mega-inner"
        style={{ "--mega-cols": colCount }}
      >
        {columns.map((column) => (
          <div className="site-header__mega-col" key={column.id}>
            {column.sections?.map((section) => (
              <div
                className="site-header__mega-section"
                key={`${column.id}-${section.heading}`}
              >
                <h3 className="site-header__mega-heading">{section.heading}</h3>
                <ul className="site-header__mega-list">
                  {(section.links || []).map((link) => (
                    <li key={link.slug || link.path}>
                      <Link
                        to={link.path}
                        className="site-header__mega-link"
                        onClick={onNavigate}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

ShopMegaMenu.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      sections: PropTypes.arrayOf(
        PropTypes.shape({
          heading: PropTypes.string.isRequired,
          links: PropTypes.arrayOf(
            PropTypes.shape({
              label: PropTypes.string.isRequired,
              slug: PropTypes.string,
              path: PropTypes.string.isRequired,
            }),
          ),
        }),
      ),
    }),
  ),
  loading: PropTypes.bool,
  onNavigate: PropTypes.func,
};

ShopMegaMenu.defaultProps = {
  columns: [],
  loading: false,
  onNavigate: undefined,
};

export default ShopMegaMenu;
