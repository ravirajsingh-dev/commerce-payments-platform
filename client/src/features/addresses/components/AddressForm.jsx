import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Button, Col, Form, Row } from "react-bootstrap";
import { City, Country, State } from "country-state-city";
import CustomSelect from "@src/components/common/CustomSelect";
import { ADDRESS_LABEL_OPTIONS } from "@src/features/addresses/addressLabelOptions";
import Errors from "@src/notifications/Errors";
import {
  sanitizeCountry,
  sanitizePincode,
  sanitizePhone,
} from "@src/utils/addressValidation";

const toSelectOption = (label, value) => ({ label, value });

const AddressForm = ({
  formData,
  onChange,
  onBlur,
  onSubmit,
  onCancel,
  visibleLocalErrors,
  errorList,
  submitLabel,
  isSubmitting,
  variant = "account",
  showActions = true,
}) => {
  const isCheckout = variant === "checkout";
  const countryCode = formData.country
    ? sanitizeCountry(formData.country)
    : "";
  const hasCountry = Boolean(countryCode);
  const hasState = Boolean(String(formData.state || "").trim());

  const selectedStateIso = useMemo(() => {
    if (!formData.state) return "";
    const match = State.getStatesOfCountry(countryCode).find(
      (s) => s.name === formData.state,
    );
    return match?.isoCode || "";
  }, [countryCode, formData.state]);

  const selectedCountry = useMemo(() => {
    const country = Country.getCountryByCode(countryCode);
    return country ? toSelectOption(country.name, country.isoCode) : null;
  }, [countryCode]);

  const selectedState = useMemo(() => {
    if (!formData.state) return null;
    const match = State.getStatesOfCountry(countryCode).find(
      (s) => s.name === formData.state,
    );
    return match ? toSelectOption(match.name, match.isoCode) : null;
  }, [countryCode, formData.state]);

  const selectedCity = useMemo(() => {
    if (!formData.city) return null;
    if (!selectedStateIso) {
      return toSelectOption(formData.city, formData.city);
    }
    const match = City.getCitiesOfState(countryCode, selectedStateIso).find(
      (c) => c.name === formData.city,
    );
    return match
      ? toSelectOption(match.name, match.name)
      : toSelectOption(formData.city, formData.city);
  }, [countryCode, formData.city, selectedStateIso]);

  const touchField = useCallback(
    (name) => {
      onBlur({ target: { name } });
    },
    [onBlur],
  );

  const selectedLabel = useMemo(() => {
    if (!formData.label) return null;
    const match = ADDRESS_LABEL_OPTIONS.find((o) => o.value === formData.label);
    return match || toSelectOption(formData.label, formData.label);
  }, [formData.label]);

  const loadLabelOptions = useCallback(async () => ADDRESS_LABEL_OPTIONS, []);

  const handleLabelChange = (option) => {
    onChange({ target: { name: "label", value: option?.value || "" } });
    touchField("label");
  };

  const loadCountryOptions = useCallback(
    async () =>
      Country.getAllCountries().map((c) => toSelectOption(c.name, c.isoCode)),
    [],
  );

  const loadStateOptions = useCallback(async () => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map((s) =>
      toSelectOption(s.name, s.isoCode),
    );
  }, [countryCode]);

  const loadCityOptions = useCallback(async () => {
    if (!countryCode || !selectedStateIso) return [];
    return City.getCitiesOfState(countryCode, selectedStateIso).map((c) =>
      toSelectOption(c.name, c.name),
    );
  }, [countryCode, selectedStateIso]);

  const handleCountryChange = (option) => {
    onChange({
      target: {
        name: "country",
        value: option?.value ? sanitizeCountry(option.value) : "",
      },
    });
    onChange({ target: { name: "state", value: "" } });
    onChange({ target: { name: "city", value: "" } });
    touchField("country");
  };

  const handleStateChange = (option) => {
    onChange({ target: { name: "state", value: option?.label || "" } });
    onChange({ target: { name: "city", value: "" } });
    touchField("state");
  };

  const handleCityChange = (option) => {
    onChange({ target: { name: "city", value: option?.value || "" } });
    touchField("city");
  };

  return (
    <Form
      className={`address-form${isCheckout ? " address-form--checkout" : ""}`}
      onSubmit={onSubmit}
    >
      <Row className="mb-3">
        {!isCheckout ? (
          <Form.Group as={Col} md="6">
            <Form.Label htmlFor="label" className="form-sub-label">
              Label
            </Form.Label>
            <CustomSelect
              value={selectedLabel}
              onChange={handleLabelChange}
              loadOptions={loadLabelOptions}
              placeholder="Select label"
              error={visibleLocalErrors.label || null}
            />
            <Errors current_key="label" key="label" />
          </Form.Group>
        ) : null}
        <Form.Group as={Col} md={isCheckout ? 12 : 6}>
          <Form.Label htmlFor="fullName" className="form-sub-label">
            Full name
          </Form.Label>
          <Form.Control
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Recipient name"
            className={
              errorList.fullName || visibleLocalErrors.fullName
                ? "form-input-invalid"
                : ""
            }
          />
          {visibleLocalErrors.fullName && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.fullName}
            </Form.Text>
          )}
          <Errors current_key="fullName" key="fullName" />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} md="6">
          <Form.Label htmlFor="phone" className="form-sub-label">
            Phone
          </Form.Label>
          <Form.Control
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={(e) =>
              onChange({
                target: { name: "phone", value: sanitizePhone(e.target.value) },
              })
            }
            onBlur={onBlur}
            placeholder="10-digit mobile"
            inputMode="numeric"
            className={
              errorList.phone || visibleLocalErrors.phone
                ? "form-input-invalid"
                : ""
            }
          />
          {visibleLocalErrors.phone && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.phone}
            </Form.Text>
          )}
          <Errors current_key="phone" key="phone" />
        </Form.Group>
        <Form.Group as={Col} md="6">
          <Form.Label htmlFor="pincode" className="form-sub-label">
            Pincode
          </Form.Label>
          <Form.Control
            id="pincode"
            name="pincode"
            value={formData.pincode}
            onChange={(e) =>
              onChange({
                target: {
                  name: "pincode",
                  value: sanitizePincode(e.target.value),
                },
              })
            }
            onBlur={onBlur}
            placeholder="6-digit pincode"
            inputMode="numeric"
            className={
              errorList.pincode || visibleLocalErrors.pincode
                ? "form-input-invalid"
                : ""
            }
          />
          {visibleLocalErrors.pincode && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.pincode}
            </Form.Text>
          )}
          <Errors current_key="pincode" key="pincode" />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} md="12">
          <Form.Label htmlFor="addressLine1" className="form-sub-label">
            Address line 1
          </Form.Label>
          <Form.Control
            id="addressLine1"
            name="addressLine1"
            value={formData.addressLine1}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="House no., street, area"
            className={
              errorList.addressLine1 || visibleLocalErrors.addressLine1
                ? "form-input-invalid"
                : ""
            }
          />
          {visibleLocalErrors.addressLine1 && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.addressLine1}
            </Form.Text>
          )}
          <Errors current_key="addressLine1" key="addressLine1" />
        </Form.Group>
      </Row>

      <Row className="mb-3">
        <Form.Group as={Col} md="12">
          <Form.Label htmlFor="addressLine2" className="form-sub-label">
            Address line 2 (optional)
          </Form.Label>
          <Form.Control
            id="addressLine2"
            name="addressLine2"
            value={formData.addressLine2}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Landmark, suite, etc."
            className={
              errorList.addressLine2 || visibleLocalErrors.addressLine2
                ? "form-input-invalid"
                : ""
            }
          />
          {visibleLocalErrors.addressLine2 && (
            <Form.Text className="text-danger">
              {visibleLocalErrors.addressLine2}
            </Form.Text>
          )}
          <Errors current_key="addressLine2" key="addressLine2" />
        </Form.Group>
      </Row>

      <Row className="mb-3 g-2 address-form__location-row">
        <Form.Group as={Col} xs={12} md={4} className="address-form__location-field">
          <Form.Label htmlFor="country" className="form-sub-label">
            Country
          </Form.Label>
          <CustomSelect
            value={selectedCountry}
            onChange={handleCountryChange}
            loadOptions={loadCountryOptions}
            placeholder="Select country"
            error={visibleLocalErrors.country || null}
          />
          <Errors current_key="country" key="country" />
        </Form.Group>
        <Form.Group as={Col} xs={12} md={4} className="address-form__location-field">
          <Form.Label htmlFor="state" className="form-sub-label">
            State
          </Form.Label>
          <CustomSelect
            key={`state-${countryCode}`}
            value={selectedState}
            onChange={handleStateChange}
            loadOptions={loadStateOptions}
            isDisabled={!hasCountry}
            placeholder="Select state"
            error={visibleLocalErrors.state || null}
          />
          <Errors current_key="state" key="state" />
        </Form.Group>
        <Form.Group as={Col} xs={12} md={4} className="address-form__location-field">
          <Form.Label htmlFor="city" className="form-sub-label">
            City
          </Form.Label>
          <CustomSelect
            key={`city-${countryCode}-${selectedStateIso}`}
            value={selectedCity}
            onChange={handleCityChange}
            loadOptions={loadCityOptions}
            isDisabled={!hasCountry || !hasState}
            placeholder="Select city"
            error={visibleLocalErrors.city || null}
          />
          <Errors current_key="city" key="city" />
        </Form.Group>
      </Row>

      {!isCheckout ? (
        <Row className="mb-3">
          <Col xs={12}>
            <Form.Check
              type="checkbox"
              id="isDefault"
              name="isDefault"
              label="Set as default shipping address"
              checked={formData.isDefault}
              onChange={onChange}
              className="address-form__default-check"
            />
          </Col>
        </Row>
      ) : null}

      {showActions ? (
        <Row>
          <Col className="d-flex justify-content-center gap-2 mt-2">
            <Button type="submit" className="btn-theme" disabled={isSubmitting}>
              {submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Col>
        </Row>
      ) : null}
    </Form>
  );
};

AddressForm.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  visibleLocalErrors: PropTypes.object.isRequired,
  errorList: PropTypes.object.isRequired,
  submitLabel: PropTypes.string,
  isSubmitting: PropTypes.bool,
  variant: PropTypes.oneOf(["account", "checkout"]),
  showActions: PropTypes.bool,
};

AddressForm.defaultProps = {
  submitLabel: "Save",
  isSubmitting: false,
  showActions: true,
};

export default AddressForm;
