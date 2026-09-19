import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Button, Col, Row, Spinner } from "react-bootstrap";
import { FaExclamationTriangle } from "react-icons/fa";

import AppPagination from "@src/components/common/AppPagination";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";
import AddressCard from "@src/features/addresses/components/AddressCard";
import AddressForm from "@src/features/addresses/components/AddressForm";
import {
  createUserAddress,
  deleteUserAddress,
  fetchUserAddresses,
  setDefaultUserAddress,
  updateUserAddress,
} from "@src/features/addresses/addressActions";
import { removeAllErrors } from "@src/app/state/actions/commonActions";
import { validateForm } from "@src/utils/validation";
import {
  addressToFormData,
  emptyAddressForm,
  getAddressValidationRules,
  sanitizeAddressForm,
} from "@src/utils/addressValidation";

const AddressBookPanel = ({
  embedded = false,
  errorList,
  removeAllErrors,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
}) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyAddressForm);
  const [fieldTouched, setFieldTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const listAnchorRef = useRef(null);

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries: paginatedAddresses,
  } = useCatalogPagination(addresses);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await fetchUserAddresses();
      setAddresses(rows);
    } catch (err) {
      setLoadError(err.message || "Unable to load saved addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    removeAllErrors();
    loadAddresses();
  }, [loadAddresses, removeAllErrors]);

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
      if (fieldTouched[path] || submitAttempted) {
        errors[path] = msg;
      }
    });
    return errors;
  }, [fieldTouched, localValidationErrors, submitAttempted]);

  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setFormData(emptyAddressForm);
    setFieldTouched({});
    setSubmitAttempted(false);
    removeAllErrors();
  };

  const openCreateForm = () => {
    removeAllErrors();
    setFormMode("create");
    setEditingId(null);
    setFormData(emptyAddressForm);
    setFieldTouched({});
    setSubmitAttempted(false);
  };

  const openEditForm = (address) => {
    removeAllErrors();
    setFormMode("edit");
    setEditingId(address._id);
    setFormData(addressToFormData(address));
    setFieldTouched({});
    setSubmitAttempted(false);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onBlur = (e) => {
    if (!e?.target?.name) return;
    setFieldTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    removeAllErrors();

    const validationErrors = validateForm(formData, getAddressValidationRules());
    if (validationErrors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    const payload = sanitizeAddressForm(formData);
    const saved =
      formMode === "edit" && editingId
        ? await updateUserAddress(editingId, payload)
        : await createUserAddress(payload);

    setIsSubmitting(false);

    if (saved) {
      resetForm();
      await loadAddresses();
    }
  };

  const handleSetDefault = async (address) => {
    setBusyId(address._id);
    const updated = await setDefaultUserAddress(address._id);
    setBusyId(null);
    if (updated) {
      await loadAddresses();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    const ok = await deleteUserAddress(deleteTarget._id);
    setBusyId(null);
    setDeleteTarget(null);
    if (ok) {
      if (editingId === deleteTarget._id) {
        resetForm();
      }
      await loadAddresses();
    }
  };

  return (
  <>
      {!embedded && (
        <Row className="align-items-center mb-3 g-2">
          <Col>
            <h2 className="custom-heading-theam mb-0">Saved Addresses</h2>
            <p className="text-muted small mb-0 mt-1">
              Manage shipping addresses for checkout.
            </p>
          </Col>
          <Col xs="auto">
            <Button className="btn-theme" onClick={openCreateForm}>
              Add address
            </Button>
          </Col>
        </Row>
      )}

      {embedded && (
        <div className="address-book-toolbar address-book-toolbar--embedded">
          <Button className="btn btn--theme" onClick={openCreateForm}>
            Add address
          </Button>
        </div>
      )}


      {loading && (
        <div className="account-address-loading">
          <Spinner animation="border" size="sm" className="account-address-loading__spinner" />
          <span>Loading addresses…</span>
        </div>
      )}

      {!loading && loadError && (
        <div className="account-address-empty account-address-empty--error">
          <p>{loadError}</p>
          <Button className="btn btn--outline" onClick={loadAddresses}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && addresses.length === 0 && (
        <div className="account-address-empty">
          <p>You have no saved addresses yet.</p>
          <Button className="btn btn--theme" onClick={openCreateForm}>
            Add your first address
          </Button>
        </div>
      )}

      {!loading && !loadError && addresses.length > 0 && (
        <>
          <ul ref={listAnchorRef} className="account-address-list">
            {paginatedAddresses.map((address) => (
              <AddressCard
                key={address._id}
                address={address}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
                onSetDefault={handleSetDefault}
                isBusy={busyId === address._id}
              />
            ))}
          </ul>
          <AppPagination
            variant="catalog"
            className="collection-page__pagination"
            params={paginationParams}
            setParams={setPaginationParams}
            count={paginationCount}
            summaryUnit="addresses"
            scrollTargetRef={listAnchorRef}
          />
        </>
      )}

      <AdvancedModal
        show={Boolean(formMode)}
        onHide={resetForm}
        title={formMode === "edit" ? "Edit address" : "Add new address"}
        size="lg"
        className="address-form-modal"
        bodyClassName="address-form-modal__body"
        closeButton
      >
        <AddressForm
          formData={formData}
          onChange={onChange}
          onBlur={onBlur}
          onSubmit={onSubmit}
          onCancel={resetForm}
          visibleLocalErrors={visibleLocalErrors}
          errorList={errorList}
          submitLabel={formMode === "edit" ? "Save changes" : "Save address"}
          isSubmitting={isSubmitting}
        />
      </AdvancedModal>

      <AdvancedModal
        show={Boolean(deleteTarget)}
        onHide={() => !busyId && setDeleteTarget(null)}
        icon={
          <FaExclamationTriangle className="common-modal-icon is-danger" />
        }
        size="sm"
        className="address-delete-modal"
        actions={[
          {
            label: "Close",
            onClick: () => setDeleteTarget(null),
            className: "btn btn--outline",
            colSize: 5,
            disabled: Boolean(busyId),
          },
          {
            label: busyId ? "Deleting..." : "Delete",
            onClick: handleDeleteConfirm,
            className: "btn btn--danger",
            colSize: 7,
            disabled: Boolean(busyId),
          },
        ]}
      >
        <p className="mb-0">
          Delete <strong>{deleteTarget?.label}</strong>? This cannot be undone.
        </p>
      </AdvancedModal>
    </>
  );
};

AddressBookPanel.propTypes = {
  embedded: PropTypes.bool,
  errorList: PropTypes.object.isRequired,
  removeAllErrors: PropTypes.func.isRequired,
  createUserAddress: PropTypes.func.isRequired,
  updateUserAddress: PropTypes.func.isRequired,
  deleteUserAddress: PropTypes.func.isRequired,
  setDefaultUserAddress: PropTypes.func.isRequired,
};

AddressBookPanel.defaultProps = {
  embedded: false,
};

const mapStateToProps = (state) => ({
  errorList: state.errors,
});

export default connect(mapStateToProps, {
  removeAllErrors,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
})(AddressBookPanel);
