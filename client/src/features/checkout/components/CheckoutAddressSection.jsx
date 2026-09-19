import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Button } from "react-bootstrap";

import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import AddressForm from "@src/features/addresses/components/AddressForm";
import {
  createUserAddress,
  fetchUserAddresses,
} from "@src/features/addresses/addressActions";
import { removeAllErrors } from "@src/app/state/actions/commonActions";
import {
  emptyAddressForm,
  getAddressValidationRules,
  sanitizeAddressForm,
} from "@src/utils/addressValidation";
import { validateForm } from "@src/utils/validation";

const formatSavedAddress = (address) => {
  const line2 = address.addressLine2 ? `, ${address.addressLine2}` : "";
  return `${address.fullName} · ${address.phone}\n${address.addressLine1}${line2}, ${address.city}, ${address.state} ${address.pincode}`;
};

const CheckoutAddressSection = ({
  errorList,
  removeAllErrors,
  createUserAddress,
  selectedAddressId,
  onSelectAddressId,
}) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showChooseModal, setShowChooseModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [chooseDraftId, setChooseDraftId] = useState("");
  const [formData, setFormData] = useState(emptyAddressForm);
  const [fieldTouched, setFieldTouched] = useState({});
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAddressIdRef = useRef(selectedAddressId);
  selectedAddressIdRef.current = selectedAddressId;

  const loadAddresses = useCallback(async (preferId) => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchUserAddresses();
      setAddresses(rows);

      if (rows.length === 0) {
        onSelectAddressId("");
        return rows;
      }

      const prefer = preferId ? String(preferId) : "";
      const stillValid = rows.some((row) => String(row._id) === prefer);
      const current = selectedAddressIdRef.current;
      const currentValid = rows.some((row) => String(row._id) === String(current));

      let nextId = "";
      if (prefer && stillValid) {
        nextId = prefer;
      } else if (currentValid) {
        nextId = String(current);
      } else {
        const defaultRow = rows.find((row) => row.isDefault) || rows[0];
        nextId = String(defaultRow._id);
      }

      if (nextId && nextId !== current) {
        onSelectAddressId(nextId);
      } else if (!current && nextId) {
        onSelectAddressId(nextId);
      }

      return rows;
    } catch (err) {
      setLoadError(err.message || "Unable to load saved addresses.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [onSelectAddressId]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const selectedSavedAddress = useMemo(
    () =>
      addresses.find((row) => String(row._id) === String(selectedAddressId)) ||
      null,
    [addresses, selectedAddressId],
  );

  const localValidationErrors = useMemo(() => {
    const errors = {};
    validateForm(formData, getAddressValidationRules()).forEach((error) => {
      errors[error.path] = error.msg;
    });
    return errors;
  }, [formData]);

  const visibleLocalErrors = useMemo(() => {
    const errors = {};
    Object.entries(localValidationErrors).forEach(([path, msg]) => {
      if (fieldTouched[path] || formSubmitAttempted) {
        errors[path] = msg;
      }
    });
    return errors;
  }, [fieldTouched, localValidationErrors, formSubmitAttempted]);

  const resetAddForm = () => {
    setShowAddModal(false);
    setFormData(emptyAddressForm);
    setFieldTouched({});
    setFormSubmitAttempted(false);
    removeAllErrors();
  };

  const openAddModal = () => {
    removeAllErrors();
    setFormData(emptyAddressForm);
    setFieldTouched({});
    setFormSubmitAttempted(false);
    setShowAddModal(true);
  };

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onFormBlur = (e) => {
    if (!e?.target?.name) return;
    setFieldTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const onSaveAddress = async (e) => {
    e.preventDefault();
    setFormSubmitAttempted(true);
    removeAllErrors();

    const validationErrors = validateForm(formData, getAddressValidationRules());
    if (validationErrors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    const payload = sanitizeAddressForm(formData);
    const saved = await createUserAddress(payload);
    setIsSubmitting(false);

    if (saved?._id) {
      resetAddForm();
      await loadAddresses(String(saved._id));
    }
  };

  const openChooseModal = () => {
    const initial =
      selectedAddressId ||
      String((addresses.find((row) => row.isDefault) || addresses[0])?._id || "");
    setChooseDraftId(initial);
    setShowChooseModal(true);
  };

  const confirmChooseAddress = () => {
    if (!chooseDraftId) return;
    removeAllErrors();
    onSelectAddressId(chooseDraftId);
    setShowChooseModal(false);
  };

  const hasMultipleAddresses = addresses.length > 1;
  const showAddressCard = Boolean(selectedSavedAddress);

  return (
    <section className="checkout-address">
      <h2 className="checkout-address__title">Shipping address</h2>

      {loading ? (
        <BouncingLoader
          minHeight="140px"
          className="checkout-address__loading"
          message="Loading saved addresses…"
        />
      ) : null}

      {!loading && loadError ? (
        <p className="checkout-address__error">{loadError}</p>
      ) : null}

      {!loading && !loadError ? (
        <>
          {!showAddressCard ? (
            <p className="checkout-address__hint">
              Add a delivery address to continue with your order.
            </p>
          ) : null}

          {showAddressCard ? (
            <article className="checkout-address__display" aria-live="polite">
              <div className="checkout-address__display-head">
                <span className="checkout-address__display-label">
                  {selectedSavedAddress.label || "Shipping address"}
                  {selectedSavedAddress.isDefault ? (
                    <span className="checkout-address__default-tag">Default</span>
                  ) : null}
                </span>
              </div>
              <p className="checkout-address__display-lines">
                {formatSavedAddress(selectedSavedAddress)}
              </p>
            </article>
          ) : null}

          <div className="checkout-address__actions">
            {hasMultipleAddresses ? (
              <Button
                type="button"
                className="btn btn--outline checkout-address__action-btn"
                onClick={openChooseModal}
              >
                Choose another address
              </Button>
            ) : null}
            <Button
              type="button"
              className="btn btn--theme checkout-address__action-btn"
              onClick={openAddModal}
            >
              Add new address
            </Button>
          </div>
        </>
      ) : null}

      <AdvancedModal
        show={showChooseModal}
        onHide={() => setShowChooseModal(false)}
        title="Choose delivery address"
        size="lg"
        className="checkout-address-modal"
        bodyClassName="checkout-address-modal__body"
        closeButton
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowChooseModal(false),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: "Use this address",
            onClick: confirmChooseAddress,
            className: "btn btn--theme",
            colSize: 7,
            disabled: !chooseDraftId,
          },
        ]}
      >
        <ul className="checkout-address__list checkout-address__list--modal">
          {addresses.map((address) => {
            const id = String(address._id);
            const isSelected = chooseDraftId === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`checkout-address__card checkout-address__card--pick${
                    isSelected ? " checkout-address__card--selected" : ""
                  }`}
                  onClick={() => setChooseDraftId(id)}
                  aria-pressed={isSelected}
                >
                  <span className="checkout-address__card-body">
                    <span className="checkout-address__card-label">
                      {address.label}
                      {address.isDefault ? (
                        <span className="checkout-address__default-tag">Default</span>
                      ) : null}
                    </span>
                    <span className="checkout-address__card-lines">
                      {formatSavedAddress(address)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </AdvancedModal>

      <AdvancedModal
        show={showAddModal}
        onHide={resetAddForm}
        title="Add new address"
        size="lg"
        className="address-form-modal"
        bodyClassName="address-form-modal__body"
        closeButton
      >
        <AddressForm
          formData={formData}
          onChange={onFormChange}
          onBlur={onFormBlur}
          onSubmit={onSaveAddress}
          onCancel={resetAddForm}
          visibleLocalErrors={visibleLocalErrors}
          errorList={errorList}
          submitLabel="Save address"
          isSubmitting={isSubmitting}
        />
      </AdvancedModal>
    </section>
  );
};

CheckoutAddressSection.propTypes = {
  errorList: PropTypes.object.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  createUserAddress: PropTypes.func.isRequired,
  selectedAddressId: PropTypes.string.isRequired,
  onSelectAddressId: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  removeAllErrors,
  createUserAddress,
})(CheckoutAddressSection);
