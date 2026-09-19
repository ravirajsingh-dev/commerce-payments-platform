import { useMemo, useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaSignOutAlt,
  FaSignInAlt,
  FaExclamationTriangle,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaEyeSlash,
  FaBars,
} from "react-icons/fa";
import {
  getSidebarMenu,
  flattenMenuForCollapsed,
} from "@src/app/router/PortalItems";
import { connect } from "react-redux";
import { logout } from "@src/features/auth/authActions";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";

const LS_COLLAPSED = "rajwada.admin.sidebarCollapsed";
const LS_HIDDEN = "rajwada.admin.sidebarHidden";

/**
 * Active when pathname matches exactly or is a sub-route of `path`.
 * If `allMenuPaths` includes a longer sibling path (e.g. /admin/inventory/stock-adjustments
 * under /admin/inventory), only the most specific match is active.
 */
const isPathActive = (pathname, path, allMenuPaths = []) => {
  if (path === "/") return pathname === "/" || pathname === "";
  if (pathname === path) return true;
  if (!pathname.startsWith(`${path}/`)) return false;

  const hasMoreSpecificMatch = allMenuPaths.some(
    (other) =>
      other !== path &&
      other.length > path.length &&
      other.startsWith(`${path}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );

  return !hasMoreSpecificMatch;
};

const Sidebar = ({
  logout,
  isAuthenticated,
  authUser,
  isLgUp = true,
  mobileOpen = false,
  onMobileClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const sheetMode = !isLgUp;

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LS_COLLAPSED) === "1";
    } catch {
      return false;
    }
  });
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(LS_HIDDEN) === "1";
    } catch {
      return false;
    }
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menu = useMemo(
    () =>
      getSidebarMenu(
        isAuthenticated,
        authUser?.permissions || {},
        Boolean(authUser?.role === 2 || authUser?.isAdmin),
      ),
    [isAuthenticated, authUser],
  );

  const flatCollapsedItems = useMemo(
    () => flattenMenuForCollapsed(menu),
    [menu],
  );

  const allMenuPaths = useMemo(() => {
    const paths = [];
    for (const section of menu) {
      if (section.path) paths.push(section.path);
      section.children?.forEach((child) => {
        if (child.path) paths.push(child.path);
      });
    }
    return paths;
  }, [menu]);

  useEffect(() => {
    for (const section of menu) {
      if (
        section.children?.some((c) =>
          isPathActive(pathname, c.path, allMenuPaths),
        )
      ) {
        setOpenDropdown(section.label);
        return;
      }
    }
  }, [pathname, menu, allMenuPaths]);

  const revealSidebar = useCallback(() => {
    setHidden(false);
    try {
      localStorage.setItem(LS_HIDDEN, "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (sheetMode && mobileOpen && hidden) {
      revealSidebar();
    }
  }, [sheetMode, mobileOpen, hidden, revealSidebar]);

  useEffect(() => {
    if (isLgUp || !mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLgUp, mobileOpen, onMobileClose]);

  useEffect(() => {
    if (isLgUp || !mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isLgUp, mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(LS_COLLAPSED, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleHidden = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(LS_HIDDEN, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next && sheetMode) {
        onMobileClose?.();
      }
      return next;
    });
  }, [sheetMode, onMobileClose]);

  const toggleDropdown = useCallback((label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }, []);

  const toggleLogoutModal = useCallback(() => {
    setShowLogoutModal((p) => !p);
  }, []);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate("/login", { replace: true });
    } catch (_error) {
      setShowLogoutModal(false);
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate]);

  const renderCollapsedList = (opts = {}) => {
    const closeOnNavigate = Boolean(opts.closeOnNavigate);
    const afterNavigate = () => {
      if (closeOnNavigate) onMobileClose?.();
    };

    return (
      <ul className="portal-sidebar__list portal-sidebar__list--icons">
        {flatCollapsedItems.map((item) => {
          const active = isPathActive(pathname, item.path, allMenuPaths);
          const Icon = item.Icon;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={afterNavigate}
                className={`portal-sidebar__icon-link${active ? " portal-sidebar__icon-link--active" : ""}`}
                title={item.label}
              >
                <Icon aria-hidden className="portal-sidebar__icon-link-svg" />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderExpandedList = (opts = {}) => {
    const closeOnNavigate = Boolean(opts.closeOnNavigate);
    const afterNavigate = () => {
      if (closeOnNavigate) onMobileClose?.();
    };

    return (
      <ul className="portal-sidebar__list">
        {menu.map((item, index) => {
          const fallbackKey = item.label ?? index;

          if (item.children?.length) {
            const childActive = item.children.some((c) =>
              isPathActive(pathname, c.path, allMenuPaths),
            );
            const itemOpen = openDropdown === item.label;
            const branchClass = [
              "portal-sidebar__item",
              "portal-sidebar__item--branch",
              itemOpen && "portal-sidebar__item--open",
              childActive && "portal-sidebar__item--child-active",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li key={fallbackKey} className={branchClass}>
                <button
                  type="button"
                  className="portal-sidebar__link portal-sidebar__link--dropdown"
                  aria-expanded={itemOpen}
                  onClick={() => toggleDropdown(item.label)}
                >
                  <span className="portal-sidebar__dropdown-label">
                    {item.label}
                  </span>
                  <span className="portal-sidebar__dropdown-chevron" aria-hidden />
                </button>
                <ul className="portal-sidebar__sub">
                  {item.children.map((child) => {
                    const subActive = isPathActive(
                      pathname,
                      child.path,
                      allMenuPaths,
                    );
                    return (
                      <li key={child.path}>
                        <Link
                          to={child.path}
                          onClick={afterNavigate}
                          className={`portal-sidebar__link portal-sidebar__link--nested${subActive ? " portal-sidebar__link--active" : ""}`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          }

          const active = isPathActive(pathname, item.path, allMenuPaths);
          return (
            <li key={fallbackKey} className="portal-sidebar__item">
              <Link
                to={item.path}
                onClick={afterNavigate}
                className={`portal-sidebar__link${active ? " portal-sidebar__link--active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFoot = (opts) => {
    const iconOnly = opts?.iconOnly;
    return (
      <footer className="portal-sidebar__foot">
        {isAuthenticated ? (
          <button
            type="button"
            className="btn btn--outline portal-sidebar__foot-btn"
            onClick={toggleLogoutModal}
            title="Logout"
          >
            <FaSignOutAlt aria-hidden />
            {!iconOnly && <span>Logout</span>}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--theme portal-sidebar__foot-btn"
            onClick={() => navigate("/login")}
          >
            <FaSignInAlt aria-hidden />
            {!iconOnly && <span>Login</span>}
          </button>
        )}
      </footer>
    );
  };

  const renderSidebarChrome = () => (
    <>
      <div className="portal-sidebar__toolbar">
        {!collapsed && (
          <span className="portal-sidebar__toolbar-title">Navigation</span>
        )}
        <div className="portal-sidebar__toolbar-actions">
          <button
            type="button"
            className="portal-sidebar__tool-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
          </button>
          <button
            type="button"
            className="portal-sidebar__tool-btn"
            onClick={toggleHidden}
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <FaEyeSlash />
          </button>
        </div>
      </div>

      <nav className="portal-sidebar__nav">
        {collapsed
          ? renderCollapsedList({ closeOnNavigate: sheetMode })
          : renderExpandedList({ closeOnNavigate: sheetMode })}
      </nav>

      {renderFoot({ iconOnly: collapsed })}
    </>
  );

  const asideClassName = [
    "portal-sidebar",
    collapsed && "portal-sidebar--collapsed",
    sheetMode && "portal-sidebar--sheet",
    sheetMode && mobileOpen && !hidden && "portal-sidebar--sheet-open",
  ]
    .filter(Boolean)
    .join(" ");

  const backdropOpen = sheetMode && mobileOpen && !hidden;

  const modal = (
    <AdvancedModal
      show={showLogoutModal}
      onHide={toggleLogoutModal}
      icon={<FaExclamationTriangle className="common-modal-icon is-danger" />}
      actions={[
        {
          label: "Close",
          onClick: toggleLogoutModal,
          className: "btn btn--outline",
          colSize: 5,
        },
        {
          label: isLoggingOut ? "Logging out..." : "Confirm",
          onClick: handleLogout,
          className: "btn btn--danger",
          disabled: isLoggingOut,
        },
      ]}
    >
      Do you want to log out?
    </AdvancedModal>
  );

  if (sheetMode) {
    return (
      <>
        <div className="portal-sidebar-root">
          <div
            className={`portal-sidebar__backdrop${backdropOpen ? " portal-sidebar__backdrop--open" : ""}`}
            aria-hidden={!backdropOpen}
            onClick={onMobileClose}
            role="presentation"
          />
          {!hidden && (
            <aside
              id="portal-sidebar-nav"
              className={asideClassName}
              aria-hidden={!mobileOpen}
              aria-label="Navigation"
            >
              {renderSidebarChrome()}
            </aside>
          )}
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      {hidden ? (
        <button
          type="button"
          className="portal-sidebar__reveal"
          onClick={revealSidebar}
          aria-label="Show sidebar"
        >
          <FaBars aria-hidden />
        </button>
      ) : (
        <aside
          id="portal-sidebar-nav"
          className={asideClassName}
          aria-label="Navigation"
        >
          {renderSidebarChrome()}
        </aside>
      )}

      {modal}
    </>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  authUser: state.auth.user,
});

export default connect(mapStateToProps, { logout })(Sidebar);
