import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";

import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";

const ShopDrawerMenu = ({ columns, loading, onClose }) => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => new Set());

  const sections = useMemo(() => {
    if (!Array.isArray(columns)) return [];
    return columns.flatMap((column) =>
      (column.sections || []).map((section) => ({
        ...section,
        id: `${column.id}-${section.heading}`,
      })),
    );
  }, [columns]);

  useEffect(() => {
    const activeSection = sections.find((section) =>
      (section.links || []).some((link) => location.pathname === link.path),
    );
    if (activeSection) {
      setOpenSections((prev) => {
        if (prev.has(activeSection.id)) return prev;
        return new Set(prev).add(activeSection.id);
      });
    }
  }, [location.pathname, sections]);

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="site-drawer__shop-tree site-drawer__shop-tree--loading">
        <CommonSpinner size="sm" />
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="site-drawer__shop-tree site-drawer__shop-tree--empty">
        <p>No collections configured yet.</p>
      </div>
    );
  }

  return (
    <div className="site-drawer__shop-tree">
      <ul className="site-drawer__shop-sections">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          const hasActiveChild = (section.links || []).some(
            (link) => location.pathname === link.path,
          );

          return (
            <li
              key={section.id}
              className={`site-drawer__shop-section${isOpen ? " site-drawer__shop-section--open" : ""}${hasActiveChild ? " site-drawer__shop-section--active" : ""}`}
            >
              <button
                type="button"
                className="site-drawer__shop-section-trigger"
                aria-expanded={isOpen}
                onClick={() => toggleSection(section.id)}
              >
                <span className="site-drawer__shop-section-label">
                  {section.heading}
                </span>
              </button>

              <ul className="site-drawer__shop-products">
                {(section.links || []).map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <li key={link.slug || link.path}>
                      <Link
                        to={link.path}
                        className={`site-drawer__shop-product-link${isActive ? " site-drawer__shop-product-link--active" : ""}`}
                        onClick={onClose}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

ShopDrawerMenu.propTypes = {
  columns: PropTypes.array,
  loading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ShopDrawerMenu.defaultProps = {
  columns: [],
  loading: false,
};

export default ShopDrawerMenu;
