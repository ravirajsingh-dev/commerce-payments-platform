import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CopyIcon from "@src/components/common/CopyIcon";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { getInitialSortingParams } from "@src/constants";
import BespokeAppointmentFilters from "../components/BespokeAppointmentFilters";
import {
  deleteBespokeSubmission,
  getBespokeSubmissionById,
  getBespokeSubmissions,
  submissionDetailClear,
} from "../bespokeAppointmentActions";

const EMPTY_FILTERS = {
  name: "",
  phone: "",
  email: "",
  service: "",
  fromDate: "",
  toDate: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
};

const compareValues = (a, b, ascending) => {
  if (a == null && b == null) return 0;
  if (a == null) return ascending === "asc" ? -1 : 1;
  if (b == null) return ascending === "asc" ? 1 : -1;
  if (a < b) return ascending === "asc" ? -1 : 1;
  if (a > b) return ascending === "asc" ? 1 : -1;
  return 0;
};

const BespokeAppointmentSubmissions = ({
  store,
  getBespokeSubmissions,
  getBespokeSubmissionById,
  deleteBespokeSubmission,
  submissionDetailClear,
}) => {
  const [detailId, setDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );

  useEffect(() => {
    getBespokeSubmissions();
  }, [getBespokeSubmissions]);

  useEffect(() => {
    if (detailId) {
      getBespokeSubmissionById(detailId);
    } else {
      submissionDetailClear();
    }
  }, [detailId, getBespokeSubmissionById, submissionDetailClear]);

  const filteredRows = useMemo(() => {
    const name = String(appliedFilters.name || "").trim().toLowerCase();
    const phone = String(appliedFilters.phone || "").trim();
    const email = String(appliedFilters.email || "").trim().toLowerCase();
    const service = String(appliedFilters.service || "").trim().toLowerCase();
    const fromDate = String(appliedFilters.fromDate || "").trim();
    const toDate = String(appliedFilters.toDate || "").trim();

    return (store.submissions.items || []).filter((row) => {
      if (name && !row.name?.toLowerCase().includes(name)) return false;
      if (phone && !String(row.phone || "").includes(phone)) return false;
      if (email && !row.email?.toLowerCase().includes(email)) return false;
      if (service && !row.serviceLabel?.toLowerCase().includes(service)) return false;

      if (fromDate || toDate) {
        const created = row.createdAt ? new Date(row.createdAt) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        const day = created.toISOString().slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
      }

      return true;
    });
  }, [store.submissions.items, appliedFilters]);

  const rows = useMemo(() => {
    const list = [...filteredRows];
    const orderBy = params?.orderBy || "createdAt";
    const ascending = params?.ascending === "asc" ? "asc" : "desc";

    list.sort((a, b) => {
      let av = a[orderBy];
      let bv = b[orderBy];

      if (orderBy === "appointmentDate" || orderBy === "createdAt") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else if (typeof av === "string") {
        av = av.toLowerCase();
        bv = String(bv || "").toLowerCase();
      }

      return compareValues(av, bv, ascending);
    });

    return list;
  }, [filteredRows, params?.orderBy, params?.ascending]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    setAppliedFilters({ ...filters });
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        sortField: "name",
        minWidth: "170px",
        cell: (row) => (
          <span className="users-table__text" title={row.name || "—"}>
            {row.name || "—"}
          </span>
        ),
      },
      {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        sortField: "email",
        minWidth: "240px",
        cell: (row) => (
          <div className="users-table__copy-cell">
            <span className="users-table__text" title={row.email || "—"}>
              {row.email || "—"}
            </span>
            {row.email ? (
              <CopyIcon textToCopy={row.email} className="copy-action" iconSize={16} />
            ) : null}
          </div>
        ),
      },
      {
        name: "Phone",
        selector: (row) => row.phone,
        sortable: true,
        sortField: "phone",
        minWidth: "180px",
        cell: (row) => (
          <div className="users-table__copy-cell">
            <span className="users-table__text" title={row.phone || "—"}>
              {row.phone || "—"}
            </span>
            {row.phone ? (
              <CopyIcon textToCopy={row.phone} className="copy-action" iconSize={16} />
            ) : null}
          </div>
        ),
      },
      {
        name: "Service",
        selector: (row) => row.serviceLabel,
        sortable: true,
        sortField: "serviceLabel",
        minWidth: "160px",
        cell: (row) => (
          <span className="users-table__text" title={row.serviceLabel || "—"}>
            {row.serviceLabel || "—"}
          </span>
        ),
      },
      {
        name: "Preferred Date",
        selector: (row) => row.appointmentDate,
        sortable: true,
        sortField: "appointmentDate",
        minWidth: "150px",
        cell: (row) => (
          <span className="users-table__text users-table__date">
            {formatDate(row.appointmentDate)}
          </span>
        ),
      },
      {
        name: "Time",
        selector: (row) => row.appointmentTime,
        sortable: true,
        sortField: "appointmentTime",
        minWidth: "110px",
        cell: (row) => (
          <span className="users-table__text">{row.appointmentTime || "—"}</span>
        ),
      },
      {
        name: "Submitted",
        selector: (row) => row.createdAt,
        sortable: true,
        sortField: "createdAt",
        minWidth: "190px",
        cell: (row) => (
          <span className="users-table__text users-table__date">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        name: "Actions",
        minWidth: "190px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn"
              onClick={() => setDetailId(row._id)}
            >
              View
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn"
              onClick={() => setDeleteTarget(row)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const onConfirmDelete = async () => {
    if (!deleteTarget?._id) return;
    const result = await deleteBespokeSubmission(deleteTarget._id);
    if (result?.status) {
      setDeleteTarget(null);
      if (detailId === deleteTarget._id) setDetailId(null);
      getBespokeSubmissions();
    }
  };

  const detail = store.selectedSubmission;
  const { loadingList, loadingSubmit } = store.submissions;

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Bespoke Appointments" },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <BespokeAppointmentFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={rows}
            progressPending={loadingList}
            count={rows.length}
            params={params}
            setParams={setParams}
            minHeight="500px"
            persistTableHead
            sortServer={false}
            noDataComponent={
              <NoRecordsFound description="No appointment requests found." />
            }
          />
        </Card.Body>
      </Card>

      <AdvancedModal
        show={Boolean(detailId)}
        onHide={() => setDetailId(null)}
        title="Appointment details"
        size="lg"
        closeButton
        actions={[
          {
            label: "Close",
            onClick: () => setDetailId(null),
            className: "btn btn--outline",
          },
        ]}
      >
        {store.loadingDetail ? (
          <BouncingLoader minHeight="120px" />
        ) : detail ? (
          <dl className="row mb-0">
            <dt className="col-sm-4">Name</dt>
            <dd className="col-sm-8">{detail.name}</dd>
            <dt className="col-sm-4">Email</dt>
            <dd className="col-sm-8">{detail.email}</dd>
            <dt className="col-sm-4">Phone</dt>
            <dd className="col-sm-8">{detail.phone}</dd>
            <dt className="col-sm-4">Service</dt>
            <dd className="col-sm-8">{detail.serviceLabel}</dd>
            <dt className="col-sm-4">Preferred date</dt>
            <dd className="col-sm-8">{formatDate(detail.appointmentDate)}</dd>
            <dt className="col-sm-4">Preferred time</dt>
            <dd className="col-sm-8">{detail.appointmentTime}</dd>
            <dt className="col-sm-4">Message</dt>
            <dd className="col-sm-8">{detail.message || "—"}</dd>
            <dt className="col-sm-4">Submitted at</dt>
            <dd className="col-sm-8">{formatDateTime(detail.createdAt)}</dd>
          </dl>
        ) : (
          <p className="text-muted mb-0">Unable to load details.</p>
        )}
      </AdvancedModal>

      <AdvancedModal
        show={Boolean(deleteTarget)}
        onHide={() => setDeleteTarget(null)}
        title="Delete appointment"
        actions={[
          {
            label: "Cancel",
            onClick: () => setDeleteTarget(null),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDelete,
            className: "btn btn--danger",
            colSize: 7,
            disabled: loadingSubmit,
          },
        ]}
      >
        <p className="mb-0">
          Permanently delete the appointment request from{" "}
          <strong>{deleteTarget?.name}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

BespokeAppointmentSubmissions.propTypes = {
  store: PropTypes.object.isRequired,
  getBespokeSubmissions: PropTypes.func.isRequired,
  getBespokeSubmissionById: PropTypes.func.isRequired,
  deleteBespokeSubmission: PropTypes.func.isRequired,
  submissionDetailClear: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  store: state.bespokeAppointment,
});

export default connect(mapStateToProps, {
  getBespokeSubmissions,
  getBespokeSubmissionById,
  deleteBespokeSubmission,
  submissionDetailClear,
})(BespokeAppointmentSubmissions);
