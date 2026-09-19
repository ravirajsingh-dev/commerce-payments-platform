import { Form } from "react-bootstrap";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";

const SettingsConfirmModal = ({
  show,
  onHide,
  onConfirm,
  txnPassword,
  txnPasswordError,
  setTxnPassword,
  clearTxnPasswordError,
}) => (
  <AdvancedModal
    show={show}
    onHide={onHide}
    title="Confirm Settings Update"
    size="md"
    className="settings-confirm-modal"
    bodyClassName="text-start"
    actions={[
      {
        label: "Close",
        onClick: onHide,
        className: "btn btn--outline",
        colSize: 5,
      },
      {
        label: "Confirm & Save",
        onClick: onConfirm,
        className: "btn btn--theme",
        colSize: 7,
      },
    ]}
  >
    <p className="mb-2">Please enter your transaction password to confirm settings update.</p>
    <Form.Group>
      <Form.Control
        type="password"
        value={txnPassword}
        onChange={(e) => {
          setTxnPassword(e.target.value);
          if (txnPasswordError) clearTxnPasswordError();
        }}
        placeholder="Transaction password"
      />
      {txnPasswordError ? (
        <small className="text-danger d-block mt-1">{txnPasswordError}</small>
      ) : null}
    </Form.Group>
  </AdvancedModal>
);

export default SettingsConfirmModal;
