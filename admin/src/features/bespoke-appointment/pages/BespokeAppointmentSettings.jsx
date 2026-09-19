import { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Container, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import CustomSelect from "@src/components/common/CustomSelect";
import { getInitialSortingParams } from "@src/constants";
import BespokeAppointmentOptionTable from "../components/BespokeAppointmentOptionTable";
import {
  createBespokeOption,
  deleteBespokeOption,
  getBespokeOptions,
  updateBespokeOption,
} from "../bespokeAppointmentActions";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const getStatusOption = (value) =>
  STATUS_OPTIONS.find((item) => String(item.value) === String(value)) ||
  STATUS_OPTIONS[0];

const BespokeAppointmentSettings = ({
  store,
  getBespokeOptions,
  createBespokeOption,
  updateBespokeOption,
  deleteBespokeOption,
}) => {
  const navigate = useNavigate();
  const [optionForm, setOptionForm] = useState({
    label: "",
    order: 1,
    isActive: true,
  });
  const [editingOption, setEditingOption] = useState(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "order", ascending: "asc" }),
  );

  useEffect(() => {
    getBespokeOptions();
  }, [getBespokeOptions]);

  const rows = useMemo(
    () => [...(store.options.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [store.options.items],
  );

  const nextOrder = useMemo(() => {
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => Number(r.order) || 0), 0) + 1;
  }, [rows]);

  const loadStatusOptions = useCallback(() => STATUS_OPTIONS, []);

  const openCreateOption = () => {
    setEditingOption(null);
    setOptionForm({ label: "", order: nextOrder, isActive: true });
    setShowOptionModal(true);
  };

  const openEditOption = (row) => {
    setEditingOption(row);
    setOptionForm({
      label: row.label || "",
      order: row.order ?? 1,
      isActive: row.isActive !== false,
    });
    setShowOptionModal(true);
  };

  const onOptionFormChange = (e) => {
    const { name, value } = e.target;
    setOptionForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) : value,
    }));
  };

  const onSaveOption = async () => {
    if (!String(optionForm.label || "").trim()) return;
    const payload = {
      label: optionForm.label.trim(),
      order: Number(optionForm.order) || nextOrder,
      isActive: optionForm.isActive === true || optionForm.isActive === "true",
    };
    const result = editingOption
      ? await updateBespokeOption(editingOption._id, payload)
      : await createBespokeOption(payload);
    if (result?.status) {
      setShowOptionModal(false);
      getBespokeOptions();
    }
  };

  const onConfirmDeleteOption = async () => {
    if (!deleteTarget?._id) return;
    const result = await deleteBespokeOption(deleteTarget._id);
    if (result?.status) {
      setDeleteTarget(null);
      getBespokeOptions();
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Bespoke Appointment Settings" },
        ]}
      />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Button
          className="btn btn--outline"
          onClick={() =>
            navigate("/admin/bespoke-appointment-settings/page-content")
          }
        >
          Manage page content
        </Button>
        <Button className="btn btn--theme" onClick={openCreateOption}>
          Add service option
        </Button>
      </div>

      <BespokeAppointmentOptionTable
        data={rows}
        loadingList={store.options.loadingList}
        params={params}
        setParams={setParams}
        onEdit={openEditOption}
        onDelete={setDeleteTarget}
      />

      <AdvancedModal
        show={showOptionModal}
        onHide={() => setShowOptionModal(false)}
        title={editingOption ? "Edit service option" : "Add service option"}
        closeButton
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowOptionModal(false),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: store.options.loadingSubmit ? "Saving..." : "Save",
            onClick: onSaveOption,
            className: "btn btn--theme",
            colSize: 7,
            disabled: store.options.loadingSubmit,
          },
        ]}
      >
        <Form.Group className="mb-3">
          <Form.Label>Label *</Form.Label>
          <Form.Control
            name="label"
            value={optionForm.label}
            onChange={onOptionFormChange}
            placeholder="e.g. Wedding"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Display order *</Form.Label>
          <Form.Control
            type="number"
            name="order"
            min={1}
            max={editingOption ? rows.length : rows.length + 1}
            value={optionForm.order}
            onChange={onOptionFormChange}
          />
          
        </Form.Group>
        <Form.Group className="mb-0">
          <Form.Label>Status</Form.Label>
          <CustomSelect
            className="entity-form__select"
            value={getStatusOption(optionForm.isActive)}
            onChange={(option) =>
              setOptionForm((prev) => ({
                ...prev,
                isActive: option?.value === "true",
              }))
            }
            loadOptions={loadStatusOptions}
            placeholder="Select status"
            isRequired
          />
        </Form.Group>
      </AdvancedModal>

      <AdvancedModal
        show={Boolean(deleteTarget)}
        onHide={() => setDeleteTarget(null)}
        title="Delete service option"
        actions={[
          {
            label: "Cancel",
            onClick: () => setDeleteTarget(null),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: store.options.loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDeleteOption,
            className: "btn btn--danger",
            colSize: 7,
            disabled: store.options.loadingSubmit,
          },
        ]}
      >
        <p className="mb-0">
          Delete &quot;{deleteTarget?.label}&quot;? Existing submissions keep the saved label.
        </p>
      </AdvancedModal>
    </Container>
  );
};

BespokeAppointmentSettings.propTypes = {
  store: PropTypes.object.isRequired,
  getBespokeOptions: PropTypes.func.isRequired,
  createBespokeOption: PropTypes.func.isRequired,
  updateBespokeOption: PropTypes.func.isRequired,
  deleteBespokeOption: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  store: state.bespokeAppointment,
});

export default connect(mapStateToProps, {
  getBespokeOptions,
  createBespokeOption,
  updateBespokeOption,
  deleteBespokeOption,
})(BespokeAppointmentSettings);
