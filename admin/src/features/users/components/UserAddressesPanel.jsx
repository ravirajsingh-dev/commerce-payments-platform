import PropTypes from "prop-types";
import { Card } from "react-bootstrap";

const formatAddressBlock = (address) => {
  const line2 = address.addressLine2 ? `, ${address.addressLine2}` : "";
  return `${address.addressLine1}${line2}, ${address.city}, ${address.state} ${address.pincode}`;
};

const AddressList = ({ addresses }) => (
  <div className="d-flex flex-column gap-3">
    {addresses.map((address) => (
      <article key={address._id} className="admin-user-address-card">
        <div className="admin-user-address-card__head">
          <strong>{address.label || "Address"}</strong>
          {address.isDefault ? (
            <span className="badge admin-user-address-card__default">Default</span>
          ) : null}
        </div>
        <p className="mb-1 admin-user-address-card__contact">
          {address.fullName} · {address.phone}
        </p>
        <p className="mb-0 admin-user-address-card__detail">
          {formatAddressBlock(address)}
        </p>
      </article>
    ))}
  </div>
);

const UserAddressesPanel = ({ addresses = [], embedded = false }) => {
  const emptyMessage = (
    <p className="mb-0 admin-user-address-card__detail">
      This user has no saved addresses yet.
    </p>
  );

  if (embedded) {
    return addresses.length ? <AddressList addresses={addresses} /> : emptyMessage;
  }

  if (!addresses.length) {
    return (
      <Card className="common-panel-card mt-3">
        <Card.Header>Saved addresses</Card.Header>
        <Card.Body>{emptyMessage}</Card.Body>
      </Card>
    );
  }

  return (
    <Card className="common-panel-card mt-3">
      <Card.Header>Saved addresses (read-only)</Card.Header>
      <Card.Body>
        <AddressList addresses={addresses} />
      </Card.Body>
    </Card>
  );
};

UserAddressesPanel.propTypes = {
  addresses: PropTypes.arrayOf(PropTypes.object),
  embedded: PropTypes.bool,
};

export default UserAddressesPanel;
