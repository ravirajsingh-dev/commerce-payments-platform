import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaExclamationTriangle,
  FaUser,
  FaShoppingBag,
  FaHeart,
} from "react-icons/fa";
import PropTypes from "prop-types";
import PortalItems from "@src/app/router/PortalItems";
import { connect } from "react-redux";
import { logout } from "@src/features/auth/authActions";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import ShopDrawerMenu from "./ShopDrawerMenu";

const Sidebar = ({
  logout,
  isOpen,
  onClose,
  isAuthenticated,
  cartItemCount,
  wishlistItemCount,
  shopColumns = [],
  shopNavLoading = false,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const toggleLogoutModal = useCallback(() => {
    setShowLogoutModal((p) => !p);
  }, []);

  const toggleDropdown = useCallback((label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }, []);

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!isOpen || !drawerRef.current) return;
      if (!drawerRef.current.contains(event.target)) onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose]);

  const menuItems = useMemo(
    () => PortalItems.filter((item) => !item.isAuth || isAuthenticated),
    [isAuthenticated],
  );

  const goRegister = useCallback(() => {
    navigate("/register");
    onClose();
  }, [navigate, onClose]);

  const goLogin = useCallback(() => {
    navigate("/login");
    onClose();
  }, [navigate, onClose]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      onClose();
      if (window.location.pathname.startsWith("/user/")) {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setShowLogoutModal(false);
      onClose();
      if (window.location.pathname.startsWith("/user/")) {
        window.location.href = "/login";
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate, onClose]);

  return (
    <>
      <div
        className={`site-drawer__backdrop${isOpen ? " site-drawer__backdrop--open" : ""}`}
        aria-hidden={!isOpen}
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        id="site-navigation-drawer"
        className={`site-drawer${isOpen ? " site-drawer--open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="Mobile navigation"
      >
        <header className="site-drawer__head">
          <span className="site-drawer__title">MENU</span>
          <button
            type="button"
            className="site-drawer__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </header>

        <nav className="site-drawer__body" aria-label="Shop navigation">
          <ul className="site-drawer__list">
            {menuItems.map((item, index) => {
              const isShopMega = Boolean(item.megaMenu);
              const shopActive =
                isShopMega &&
                (location.pathname.startsWith("/collection") ||
                  location.pathname.startsWith("/collections"));
              const childActive = item.children?.some(
                (c) =>
                  location.pathname === c.path ||
                  location.pathname.startsWith(`${c.path}/`),
              );
              const linkActive = (() => {
                if (item.children || isShopMega || !item.path) return false;
                const [basePath, search] = item.path.split("?");
                if (location.pathname !== basePath) return false;
                if (!search) return true;
                return location.search === `?${search}`;
              })();

              const itemOpen = openDropdown === item.label;
              const hasBranch = item.children || isShopMega;
              const modifiers = [
                hasBranch && "site-drawer__item--branch",
                itemOpen && "site-drawer__item--open",
                (childActive || shopActive) && "site-drawer__item--child-active",
                linkActive && "site-drawer__item--active",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li
                  key={item.path || item.label || index}
                  className={`site-drawer__item ${modifiers}`.trim()}
                >
                  {hasBranch ? (
                    <button
                      type="button"
                      className="site-drawer__parent"
                      aria-expanded={itemOpen}
                      onClick={() => toggleDropdown(item.label)}
                    >
                      <span className="site-drawer__parent-label">
                        {item.label}
                      </span>
                    </button>
                  ) : (
                    <Link
                      className="site-drawer__link"
                      to={item.path || "#"}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  )}

                  {isShopMega && itemOpen && (
                    <ShopDrawerMenu
                      columns={shopColumns}
                      loading={shopNavLoading}
                      onClose={onClose}
                    />
                  )}

                  {item.children && !isShopMega && (
                    <ul className="site-drawer__sub">
                      {item.children.map((child, childIndex) => {
                        const showIcon =
                          item.label !== "Appointments" &&
                          (child.iconKey || child.icon);
                        const subActive = location.pathname === child.path;

                        return (
                          <li key={child.path || childIndex}>
                            <Link
                              to={child.path}
                              className={`site-drawer__sub-link${showIcon ? " site-drawer__sub-link--media" : ""}${subActive ? " site-drawer__sub-link--active" : ""}`}
                              onClick={onClose}
                            >
                              {showIcon && !child.iconKey && child.icon && (
                                <span className="site-drawer__sub-icon">
                                  {child.icon}
                                </span>
                              )}
                              <span className="site-drawer__sub-text">
                                <span className="site-drawer__sub-label">
                                  {child.label}
                                </span>
                                {child.subtitle && (
                                  <span className="site-drawer__sub-desc">
                                    {child.subtitle}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="site-drawer__foot">
          {isAuthenticated ? (
            <div className="site-drawer__foot-row site-drawer__foot-row--auth">
              <Link
                to="/cart"
                className="btn btn--outline site-drawer__foot-btn site-drawer__cart-btn"
                onClick={onClose}
                aria-label={
                  cartItemCount > 0
                    ? `Shopping cart, ${cartItemCount} items`
                    : "Shopping cart"
                }
              >
                <FaShoppingBag aria-hidden />
                {cartItemCount > 0 ? (
                  <span className="site-drawer__cart-badge">{cartItemCount}</span>
                ) : null}
              </Link>
              <Link
                to="/user/wishlist"
                className="btn btn--outline site-drawer__foot-btn site-drawer__wishlist-btn"
                onClick={onClose}
                aria-label={
                  wishlistItemCount > 0
                    ? `Wishlist, ${wishlistItemCount} items`
                    : "Wishlist"
                }
              >
                <FaHeart aria-hidden />
                {wishlistItemCount > 0 ? (
                  <span className="site-drawer__wishlist-badge">{wishlistItemCount}</span>
                ) : null}
              </Link>
              <Link
                to="/user/my-account"
                className="btn btn--outline site-drawer__foot-btn"
                onClick={onClose}
                aria-label="My Account"
              >
                <FaUser aria-hidden />
              </Link>
              <button
                type="button"
                className="btn btn--outline site-drawer__foot-btn"
                onClick={toggleLogoutModal}
              >
                <FaSignOutAlt aria-hidden />
                Logout
              </button>
            </div>
          ) : (
            <div className="site-drawer__foot-row">
              <button
                type="button"
                className="btn btn--outline site-drawer__foot-btn"
                onClick={goRegister}
              >
                <FaUserPlus aria-hidden />
                Register
              </button>
              <button
                type="button"
                className="btn btn--theme site-drawer__foot-btn"
                onClick={goLogin}
              >
                <FaSignInAlt aria-hidden />
                Login
              </button>
            </div>
          )}
        </footer>
      </aside>

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
    </>
  );
};

Sidebar.propTypes = {
  logout: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  shopColumns: PropTypes.array,
  shopNavLoading: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  cartItemCount: state.cart?.cart?.itemCount || 0,
  wishlistItemCount: state.wishlist?.wishlist?.itemCount || 0,
});

export default connect(mapStateToProps, { logout })(Sidebar);
