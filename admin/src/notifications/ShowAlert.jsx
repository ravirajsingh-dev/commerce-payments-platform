import { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const defaultToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored", // or "dark", "light"
};

const ShowAlert = ({ alerts = [], toastOptions = {} }) => {
  const createAlertNotification = (message, type) => {
    const normalizedType = type === "danger" ? "error" : type;
    const finalOptions = { ...defaultToastOptions, ...toastOptions };

    switch (normalizedType) {
      case "info":
        return toast.info(message, finalOptions);
      case "success":
        return toast.success(message, finalOptions);
      case "warning":
        return toast.warning(message, finalOptions);
      case "error":
        return toast.error(message, finalOptions);
      default:
        return toast(message, finalOptions);
    }
  };

  useEffect(() => {
    alerts &&
      alerts.length > 0 &&
      alerts.forEach((alert) => {
        createAlertNotification(alert.msg, alert.alertType);
      });
  }, [alerts]);

  return <ToastContainer />;
};

ShowAlert.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      alertType: PropTypes.string.isRequired,
      msg: PropTypes.string.isRequired,
    })
  ),
  toastOptions: PropTypes.object,
};

const mapStateToProps = (state) => ({
  alerts: state.alert,
});

export default connect(mapStateToProps)(ShowAlert);
