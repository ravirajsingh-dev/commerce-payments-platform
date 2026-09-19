import PropTypes from "prop-types";
import { FaCheck, FaEdit, FaStar, FaTrash } from "react-icons/fa";

const formatAddressLines = (address) => {
  const line2 = address.addressLine2 ? `, ${address.addressLine2}` : "";
  return `${address.addressLine1}${line2}, ${address.city}, ${address.state} ${address.pincode}, ${address.country}`;
};

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isBusy,
}) => (
  <li className="account-address-item">
    <div className="account-address-item__card">
      <div className="account-address-item__head">
        <span className="account-address-item__label">{address.label}</span>
        <div className="account-address-item__head-end">
          {address.isDefault ? (
            <span className="account-address-item__default">
              <FaCheck className="account-address-item__default-icon" aria-hidden />
              Default
            </span>
          ) : null}
          <div
            className="account-address-item__toolbar"
            role="toolbar"
            aria-label="Address actions"
          >
            {!address.isDefault ? (
              <button
                type="button"
                className="account-address-item__icon-btn"
                title="Set as default"
                aria-label="Set as default shipping address"
                onClick={() => onSetDefault(address)}
                disabled={isBusy}
              >
                <FaStar aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="account-address-item__icon-btn"
              title="Edit address"
              aria-label="Edit address"
              onClick={() => onEdit(address)}
              disabled={isBusy}
            >
              <FaEdit aria-hidden />
            </button>
            <button
              type="button"
              className="account-address-item__icon-btn account-address-item__icon-btn--danger"
              title="Delete address"
              aria-label="Delete address"
              onClick={() => onDelete(address)}
              disabled={isBusy}
            >
              <FaTrash aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <p className="account-address-item__contact">
        {address.fullName}
        {address.phone ? ` · ${address.phone}` : ""}
      </p>
      <p className="account-address-item__address">{formatAddressLines(address)}</p>
    </div>
  </li>
);

AddressCard.propTypes = {
  address: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
  isBusy: PropTypes.bool,
};

AddressCard.defaultProps = {
  isBusy: false,
};

export default AddressCard;
