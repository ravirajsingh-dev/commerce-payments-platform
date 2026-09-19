import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

import { removeAllErrors } from "@src/app/state/actions/commonActions";
import ShowAlert from "@src/notifications/ShowAlert";
import Header from "./Header";
import Footer from "./Footer";
import DefaultFooter from "./DefaultFooter";

const Publicayout = ({ alerts: _alerts, removeAllErrors }) => {
  const location = useLocation();

  useEffect(() => {
    // Clear alerts when URL changes
    removeAllErrors();
  }, [location.pathname, removeAllErrors]);

  return (
    <HelmetProvider>
      <ShowAlert />
      <div className="d-flex flex-column min-vh-100">
        <Header />

        <div className="flex-grow-1">
          <Outlet />
        </div>

        <Footer />
        <DefaultFooter />
      </div>
    </HelmetProvider>
  );
};

Publicayout.propTypes = {
  alerts: PropTypes.array.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  alerts: state.alert,
});

export default connect(mapStateToProps, { removeAllErrors })(Publicayout);
