import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaExclamationTriangle,
  FaSearch,
  FaUser,
  FaShoppingBag,
  FaHeart,
} from "react-icons/fa";
import PortalItems from "@src/app/router/PortalItems";
import { BiSolidChevronDown } from "react-icons/bi";
import Sidebar from "./Sidebar";
import ShopMegaMenu from "./ShopMegaMenu";
import { connect } from "react-redux";
import { logout } from "@src/features/auth/authActions";
import { getCommonSettings } from "@src/app/state/actions/commonActions";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import { useStoreNavigation } from "@src/hooks/useStoreNavigation";
import { fetchCart } from "@src/features/cart/cartActions";
import { fetchWishlist } from "@src/features/wishlist/wishlistActions";

const Header = ({
  logout,
  isAuthenticated,
  cartItemCount,
  wishlistItemCount,
  fetchCart,
  fetchWishlist,
  commonSettings,
  loadingCommonSettings,
  getCommonSettings,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const headerRef = useRef(null);
  const megaCloseTimerRef = useRef(null);

  const { columns: shopColumns, loading: shopNavLoading } = useStoreNavigation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [shopMegaOpen, setShopMegaOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleLogoutModal = useCallback(
    () => setShowLogoutModal((p) => !p),
    [],
  );

  const clearMegaCloseTimer = useCallback(() => {
    if (megaCloseTimerRef.current) {
      window.clearTimeout(megaCloseTimerRef.current);
      megaCloseTimerRef.current = null;
    }
  }, []);

  const scheduleMegaClose = useCallback(() => {
    clearMegaCloseTimer();
    megaCloseTimerRef.current = window.setTimeout(() => {
      setShopMegaOpen(false);
      setOpenDropdown(null);
    }, 180);
  }, [clearMegaCloseTimer]);

  const openShopMega = useCallback(() => {
    clearMegaCloseTimer();
    setShopMegaOpen(true);
  }, [clearMegaCloseTimer]);

  const closeShopMega = useCallback(() => {
    clearMegaCloseTimer();
    setShopMegaOpen(false);
    setOpenDropdown(null);
  }, [clearMegaCloseTimer]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      if (window.location.pathname.startsWith("/user/")) {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setShowLogoutModal(false);
      if (window.location.pathname.startsWith("/user/")) {
        window.location.href = "/login";
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate]);

  useEffect(() => {
    fetchCart();
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  useEffect(() => {
    setOpenDropdown(null);
    setShopMegaOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setShopMegaOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => () => clearMegaCloseTimer(), [clearMegaCloseTimer]);

  const isNavItemActive = useCallback(
    (item) => {
      if (item.megaMenu) {
        return (
          location.pathname.startsWith("/collection") ||
          location.pathname.startsWith("/collections")
        );
      }
      if (item.path) {
        const [basePath, search] = item.path.split("?");
        if (location.pathname !== basePath) return false;
        if (!search) return true;
        return location.search === `?${search}`;
      }
      if (item.children) {
        return item.children.some(
          (c) =>
            location.pathname === c.path ||
            location.pathname.startsWith(`${c.path}/`),
        );
      }
      return false;
    },
    [location.pathname],
  );

  useEffect(() => {
    getCommonSettings();
  }, [getCommonSettings]);

  const logoUrl = commonSettings?.logoUrl;
  const loadingLogo = loadingCommonSettings || !logoUrl;

  const menuItems = useMemo(
    () => PortalItems.filter((item) => !item.isAuth),
    [],
  );

  useEffect(() => {
    const stickyEnterThreshold = 345;
    const stickyExitThreshold = 305;
    let rafId = null;
    let stickyState = false;

    const updateHeaderStickyState = () => {
      const header = headerRef.current;
      if (!header) return;

      const scroll = window.scrollY || document.documentElement.scrollTop;
      const maxScrollableDistance =
        document.documentElement.scrollHeight - window.innerHeight;
      const canReachStickyThreshold =
        maxScrollableDistance > stickyEnterThreshold;

      let shouldStick = stickyState;
      if (!canReachStickyThreshold) {
        shouldStick = false;
      } else if (!stickyState && scroll >= stickyEnterThreshold) {
        shouldStick = true;
      } else if (stickyState && scroll <= stickyExitThreshold) {
        shouldStick = false;
      }

      const wrapper = header.closest("#top-menu");
      if (wrapper) {
        wrapper.style.setProperty(
          "--layout-header-height",
          `${header.offsetHeight}px`,
        );
      }

      header.classList.toggle("site-header__bar--sticky", shouldStick);
      stickyState = shouldStick;
      setIsHeaderSticky((prev) => (prev === shouldStick ? prev : shouldStick));
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateHeaderStickyState();
        rafId = null;
      });
    };

    updateHeaderStickyState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateHeaderStickyState);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeaderStickyState);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const closeMegaOnNavigate = useCallback(() => {
    closeShopMega();
  }, [closeShopMega]);

  return (
    <header
      id="top-menu"
      className={`site-header${isHeaderSticky ? " site-header--offset" : ""}${shopMegaOpen ? " site-header--mega-open" : ""}`}
    >
      <div className="site-header__bar" ref={headerRef}>
        <div className="site-header__shell site-header__row">
          <Link className="site-header__brand" to="/" title="Home">
            {loadingLogo ? (
              <CommonSpinner size="sm" />
            ) : (
              <img
                src={logoUrl}
                alt="Application logo"
                width={80}
                height={80}
              />
            )}
          </Link>

          <nav
            className="site-header__nav"
            ref={navRef}
            aria-label="Primary navigation"
          >
            <ul className="site-header__menu">
              {menuItems.map((item, i) => {
                const isShopMega = Boolean(item.megaMenu);
                const isOpen = isShopMega
                  ? shopMegaOpen
                  : openDropdown === item.label;

                return (
                  <li
                    key={item.path || item.label || i}
                    className={`site-header__item${isOpen ? " site-header__item--open" : ""}${isShopMega ? " site-header__item--mega" : ""}`}
                    onMouseEnter={isShopMega ? openShopMega : undefined}
                    onMouseLeave={isShopMega ? scheduleMegaClose : undefined}
                  >
                    {isShopMega ? (
                      <button
                        type="button"
                        className={`site-header__trigger site-header__trigger--mega${isNavItemActive(item) ? " active" : ""}`}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (shopMegaOpen) {
                            closeShopMega();
                          } else {
                            openShopMega();
                          }
                        }}
                      >
                        {item.label}
                        <BiSolidChevronDown
                          className="site-header__chevron"
                          aria-hidden
                        />
                      </button>
                    ) : item.children ? (
                      <button
                        type="button"
                        className={`site-header__trigger${isNavItemActive(item) ? " active" : ""}`}
                        aria-expanded={isOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown === item.label ? null : item.label,
                          );
                        }}
                      >
                        {item.label}
                        <BiSolidChevronDown
                          className="site-header__chevron"
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <Link
                        to={item.path || "#"}
                        className={`site-header__link${isNavItemActive(item) ? " active" : ""}`}
                      >
                        {item.label}
                      </Link>
                    )}

                    {item.children && !isShopMega && (
                      <ul className="site-header__dropdown">
                        {item.children.map((subItem, j) => (
                          <li key={subItem.path || j}>
                            <Link
                              to={subItem.path}
                              className={`site-header__dropdown-link${subItem.iconKey || subItem.icon ? " site-header__dropdown-link--media" : ""}${location.pathname === subItem.path ? " active" : ""}`}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {!subItem.iconKey && subItem.icon && (
                                <span className="site-header__dropdown-icon">
                                  {subItem.icon}
                                </span>
                              )}
                              <span className="site-header__dropdown-text">
                                <span className="site-header__dropdown-label">
                                  {subItem.label}
                                </span>
                                {subItem.subtitle && (
                                  <span className="site-header__dropdown-desc">
                                    {subItem.subtitle}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="site-header__actions">
            <Link
              className="btn btn--outline btn--icon site-header__search-icon"
              to="/search"
              aria-label="Search catalog"
              onClick={closeMegaOnNavigate}
            >
              <FaSearch aria-hidden />
            </Link>

            <Link
              className="btn btn--outline btn--icon site-header__cart-link"
              to="/cart"
              aria-label={
                cartItemCount > 0
                  ? `Shopping cart, ${cartItemCount} items`
                  : "Shopping cart"
              }
              onClick={closeMegaOnNavigate}
            >
              <FaShoppingBag aria-hidden />
              {cartItemCount > 0 ? (
                <span className="site-header__cart-badge">{cartItemCount}</span>
              ) : null}
            </Link>

            <Link
              className="btn btn--outline btn--icon site-header__wishlist-link"
              to={isAuthenticated ? "/user/wishlist" : "/login"}
              state={isAuthenticated ? undefined : { from: "/user/wishlist" }}
              aria-label={
                isAuthenticated && wishlistItemCount > 0
                  ? `Wishlist, ${wishlistItemCount} items`
                  : "Wishlist"
              }
              onClick={closeMegaOnNavigate}
            >
              <FaHeart aria-hidden />
              {isAuthenticated && wishlistItemCount > 0 ? (
                <span className="site-header__wishlist-badge">{wishlistItemCount}</span>
              ) : null}
            </Link>

            {isAuthenticated && (
              <Link
                className={`btn btn--outline site-header__account-btn${location.pathname.startsWith("/user/my-account") ? " active" : ""}`}
                to="/user/my-account"
                aria-label="My Account"
                title="My Account"
                onClick={closeMegaOnNavigate}
              >
                <FaUser aria-hidden />
                <span className="site-header__account-label">My Account</span>
              </Link>
            )}

            <button
              type="button"
              className="btn btn--outline btn--icon"
              onClick={toggleSidebar}
              aria-label="Open menu"
              aria-expanded={isSidebarOpen}
              aria-controls="site-navigation-drawer"
            >
              <FaBars />
            </button>
            <div className="site-header__auth btn-group-inline">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={toggleLogoutModal}
                >
                  <FaSignOutAlt />
                  <span className="site-header__auth-label">Logout</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => navigate("/register")}
                    aria-label="Register"
                  >
                    <FaUserPlus />
                    <span className="site-header__auth-label">Register</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--theme"
                    onClick={() => navigate("/login")}
                    aria-label="Login"
                  >
                    <FaSignInAlt />
                    <span className="site-header__auth-label">Login</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {shopMegaOpen && (
          <div
            className="site-header__mega-wrap"
            onMouseEnter={openShopMega}
            onMouseLeave={scheduleMegaClose}
          >
            <ShopMegaMenu
              columns={shopColumns}
              loading={shopNavLoading}
              onNavigate={closeMegaOnNavigate}
            />
          </div>
        )}
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        shopColumns={shopColumns}
        shopNavLoading={shopNavLoading}
      />

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
    </header>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  cartItemCount: state.cart?.cart?.itemCount || 0,
  wishlistItemCount: state.wishlist?.wishlist?.itemCount || 0,
  commonSettings: state.common?.commonSettings || {},
  loadingCommonSettings: state.common?.loadingCommonSettings || false,
});

export default connect(mapStateToProps, {
  logout,
  getCommonSettings,
  fetchCart,
  fetchWishlist,
})(Header);
