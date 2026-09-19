import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

import ShowAlert from "@src/notifications/ShowAlert";

import Header from "./Header";
import Sidebar from "./Sidebar";
import DefaultFooter from "./DefaultFooter";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { getCommonSettings } from "@src/app/state/actions/commonActions";
import { useMediaQuery } from "@src/hooks/useMediaQuery";
import {
  shouldRedirectToLogin,
  shouldShowAuthLoader,
} from "@src/app/router/authGuard";

const PortalLayout = ({
  auth: { isAuthenticated, loading },
  alerts: _alerts,
  common: { commonSettings: _commonSettings },
  getCommonSettings,
}) => {
  const location = useLocation();
  const isLgUp = useMediaQuery("(min-width: 1200px)");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsAuthChecked(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      getCommonSettings();
    }
  }, [getCommonSettings, isAuthenticated, loading]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isLgUp) setMobileSidebarOpen(false);
  }, [isLgUp]);

  if (shouldShowAuthLoader({ loading, isAuthChecked })) {
    return <BouncingLoader minHeight="500px" />;
  }

  if (shouldRedirectToLogin({ isAuthenticated })) {
    return <Navigate to="/login" />;
  }

  return (
    <HelmetProvider>
      <ShowAlert />
      <div className="portal-shell d-flex flex-column">
        <Header
          showMobileSidebarControl={!isLgUp}
          mobileSidebarOpen={mobileSidebarOpen}
          onMobileSidebarToggle={() => setMobileSidebarOpen((open) => !open)}
        />
        <div className="portal-body flex-grow-1 d-flex min-vh-0">
          <Sidebar
            isLgUp={isLgUp}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
          <main className="portal-body__main flex-grow-1 min-vw-0 min-vh-0 overflow-auto">
            <Outlet />
          </main>
        </div>

        <DefaultFooter />
      </div>
    </HelmetProvider>
  );
};

PortalLayout.propTypes = {
  auth: PropTypes.object.isRequired,
  alerts: PropTypes.array.isRequired,
  common: PropTypes.object.isRequired,
  getCommonSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  alerts: state.alert || [],
  common: state.common,
});

export default connect(mapStateToProps, { getCommonSettings })(PortalLayout);
