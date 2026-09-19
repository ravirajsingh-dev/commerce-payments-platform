import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Form } from "react-bootstrap";

const Errors = ({ errorList, current_key, message = "" }) => {
  const resolvedMessage = message || errorList[current_key];
  return (
    <div className="form-field-feedback" aria-live="polite">
      {resolvedMessage ? (
        <Form.Text className="form-error-message">{resolvedMessage}</Form.Text>
      ) : null}
    </div>
  );
};

Errors.propTypes = {
  errorList: PropTypes.object.isRequired,
  current_key: PropTypes.string.isRequired,
  message: PropTypes.string,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps)(Errors);
