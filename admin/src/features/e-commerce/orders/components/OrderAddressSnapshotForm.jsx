import PropTypes from "prop-types";
import { Col, Form, Row } from "react-bootstrap";
import Errors from "@src/notifications/Errors";

const OrderAddressSnapshotForm = ({ form, onChange }) => (
  <Row className="g-3">
    <Col xs={12} md={6}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-fullName">
          Full name
        </Form.Label>
        <Form.Control
          id="order-address-fullName"
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          autoComplete="name"
        />
        <Errors current_key="fullName" />
      </Form.Group>
    </Col>
    <Col xs={12} md={6}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-phone">
          Phone
        </Form.Label>
        <Form.Control
          id="order-address-phone"
          name="phone"
          value={form.phone}
          onChange={onChange}
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
        />
        <Errors current_key="phone" />
      </Form.Group>
    </Col>
    <Col xs={12}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-line1">
          Address line 1
        </Form.Label>
        <Form.Control
          id="order-address-line1"
          name="addressLine1"
          value={form.addressLine1}
          onChange={onChange}
          autoComplete="address-line1"
        />
        <Errors current_key="addressLine1" />
      </Form.Group>
    </Col>
    <Col xs={12}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-line2">
          Address line 2
        </Form.Label>
        <Form.Control
          id="order-address-line2"
          name="addressLine2"
          value={form.addressLine2}
          onChange={onChange}
          autoComplete="address-line2"
        />
        <Errors current_key="addressLine2" />
      </Form.Group>
    </Col>
    <Col xs={12} md={4}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-city">
          City
        </Form.Label>
        <Form.Control
          id="order-address-city"
          name="city"
          value={form.city}
          onChange={onChange}
          autoComplete="address-level2"
        />
        <Errors current_key="city" />
      </Form.Group>
    </Col>
    <Col xs={12} md={4}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-state">
          State
        </Form.Label>
        <Form.Control
          id="order-address-state"
          name="state"
          value={form.state}
          onChange={onChange}
          autoComplete="address-level1"
        />
        <Errors current_key="state" />
      </Form.Group>
    </Col>
    <Col xs={12} md={4}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-pincode">
          Pincode
        </Form.Label>
        <Form.Control
          id="order-address-pincode"
          name="pincode"
          value={form.pincode}
          onChange={onChange}
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
        />
        <Errors current_key="pincode" />
      </Form.Group>
    </Col>
    <Col xs={12} md={4}>
      <Form.Group>
        <Form.Label className="form-sub-label" htmlFor="order-address-country">
          Country
        </Form.Label>
        <Form.Control
          id="order-address-country"
          name="country"
          value={form.country}
          onChange={onChange}
          maxLength={2}
        />
        <Errors current_key="country" />
      </Form.Group>
    </Col>
  </Row>
);

OrderAddressSnapshotForm.propTypes = {
  form: PropTypes.shape({
    fullName: PropTypes.string,
    phone: PropTypes.string,
    addressLine1: PropTypes.string,
    addressLine2: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    pincode: PropTypes.string,
    country: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default OrderAddressSnapshotForm;
