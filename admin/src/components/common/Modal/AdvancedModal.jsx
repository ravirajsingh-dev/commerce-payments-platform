import PropTypes from "prop-types";
import { Col, Modal, Button, Row } from "react-bootstrap";

const AdvancedModal = ({
  show,
  onHide,
  icon,
  title,
  children,
  actions = [],
  size = "sm",
  backdrop = true,
  keyboard = true,
  closeButton = false,
  bodyClassName = "",
  className = "",
}) => {
  return (
    <Modal
      show={show}
      size={size}
      centered
      className={`common-modal ${className}`.trim()}
      onHide={onHide}
      backdrop={backdrop}
      keyboard={keyboard}
    >
      <Modal.Header className="common-modal-header" closeButton={closeButton}>
        <Modal.Title className="common-modal-title">
          {icon || title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={`common-modal-body ${bodyClassName}`.trim()}>
        {children}
      </Modal.Body>

      {actions.length > 0 ? (
        <Modal.Footer className="common-modal-footer">
          <Row className="g-3 w-100 mx-0">
            {actions.map((action, index) => (
              <Col
                key={action.label || index}
                xs={12}
                sm={action.colSize || Math.max(Math.floor(12 / actions.length), 6)}
                className="d-grid"
              >
                <Button
                  type={action.type || "button"}
                  variant={null}
                  className={`${action.className || ""} w-100`.trim()}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              </Col>
            ))}
          </Row>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
};

AdvancedModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  icon: PropTypes.node,
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      className: PropTypes.string,
      disabled: PropTypes.bool,
      type: PropTypes.string,
      colSize: PropTypes.number,
    }),
  ),
  size: PropTypes.string,
  backdrop: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  keyboard: PropTypes.bool,
  closeButton: PropTypes.bool,
  bodyClassName: PropTypes.string,
  className: PropTypes.string,
  titleText: PropTypes.string,
};

export default AdvancedModal;
