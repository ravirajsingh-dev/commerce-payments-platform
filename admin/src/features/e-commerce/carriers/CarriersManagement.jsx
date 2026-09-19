import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CopyIcon from "@src/components/common/CopyIcon";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants/index";
import { deleteCarrier, getCarriersList } from "./carrierActions";
import CarrierFilters from "./CarrierFilters";
import { fulfillmentModeLabel } from "@src/constants/carrier";

const CarriersManagement = ({ carriersStore, getCarriersList, deleteCarrier }) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    slug: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(null);

  const { carriers, totalRecord, summary, loadingList, loadingSubmit } =
    carriersStore;

  useEffect(() => {
    getCarriersList(params);
  }, [getCarriersList, params]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const slug = String(nextFiltersData.slug || "").trim();
    const fromDate = String(nextFiltersData.fromDate || "").trim();
    const toDate = String(nextFiltersData.toDate || "").trim();
    const statusValue = nextFiltersData.status;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (slug) {
      nextFilters.push("slug");
      nextQuery.slug = { value: slug, type: "String" };
    }
    if (
      statusValue !== "" &&
      statusValue !== null &&
      statusValue !== undefined
    ) {
      nextFilters.push("isActive");
      nextQuery.isActive = {
        value: statusValue === true || statusValue === "true",
        type: "Boolean",
      };
    }
    if (fromDate && toDate) {
      nextFilters.push("createdAt");
      nextQuery.createdAt = { value: `${fromDate}|${toDate}`, type: "Date" };
    }

    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: nextFilters.join(","),
      query: Object.keys(nextQuery).length ? JSON.stringify(nextQuery) : "",
    }));
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name === "status") {
      if (value === "" || value === null || value === undefined) {
        setSelectedSummaryStatus(null);
      } else {
        setSelectedSummaryStatus(value === true || value === "true");
      }
    }
  };

  const onSearch = () => {
    if (
      filters.status === "" ||
      filters.status === null ||
      filters.status === undefined
    ) {
      setSelectedSummaryStatus(null);
    } else {
      setSelectedSummaryStatus(filters.status === true || filters.status === "true");
    }
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      slug: "",
      status: "",
      fromDate: "",
      toDate: "",
    };
    setSelectedSummaryStatus(null);
    setFilters(resetState);
    applyFilters(resetState);
  };

  const handleOpenCreate = () => {
    navigate("/admin/carriers/create");
  };

  const handleOpenEdit = (carrier) => {
    navigate(`/admin/carriers/${carrier._id}/edit`);
  };

  const handleOpenDelete = (carrier) => {
    setSelectedCarrier(carrier);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedCarrier(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedCarrier?._id) return;
    const result = await deleteCarrier(selectedCarrier._id);
    if (result?.status) {
      handleCloseDelete();
      await getCarriersList(params);
    }
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFiltersData = {
      ...filters,
      status: statusValue === null ? "" : String(statusValue),
    };
    setFilters(nextFiltersData);
    applyFilters(nextFiltersData);
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
          <span className="users-table__text" title={row.name || "-"}>
            {row.name || "-"}
          </span>
        ),
      },
      {
        name: "Fulfillment",
        selector: (row) => row.fulfillmentMode,
        minWidth: "110px",
        cell: (row) => (
          <span className="users-table__text">
            {fulfillmentModeLabel(row.fulfillmentMode || "online")}
          </span>
        ),
      },
      {
        name: "Slug",
        selector: (row) => row.slug,
        sortable: true,
        sortField: "slug",
        minWidth: "160px",
        cell: (row) => (
          <div className="users-table__copy-cell">
            <span className="users-table__text" title={row.slug || "-"}>
              {row.slug || "-"}
            </span>
            {row.slug ? (
              <CopyIcon textToCopy={row.slug} className="copy-action" iconSize={16} />
            ) : null}
          </div>
        ),
      },
      {
        name: "Tracking URL",
        selector: (row) => row.trackingUrl,
        minWidth: "400px",
        grow: 2,
        wrap: true,
        cell: (row) => (
          <div
            className="users-table__copy-cell"
            style={{ alignItems: "flex-start", gap: "0.35rem" }}
          >
            <span
              title={row.trackingUrl || "-"}
              style={{
                display: "block",
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "normal",
                wordBreak: "break-all",
                overflowWrap: "anywhere",
                lineHeight: 1.35,
                paddingRight: "0.5rem",
              }}
            >
              {row.trackingUrl || "-"}
            </span>
            {row.trackingUrl ? (
              <CopyIcon
                textToCopy={row.trackingUrl}
                className="copy-action"
                iconSize={16}
              />
            ) : null}
          </div>
        ),
      },
      {
        name: "Created Date",
        selector: (row) => row.createdAt,
        sortable: true,
        sortField: "createdAt",
        minWidth: "190px",
        cell: (row) => (
          <span className="users-table__text users-table__date">
            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
          </span>
        ),
      },
      {
        name: "Status",
        sortable: true,
        sortField: "isActive",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-status-cell">
            <span
              className={`badge entity-status entity-status--${row.isActive ? "active" : "inactive"}`}
            >
              {row.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ),
      },
      {
        name: "Actions",
        width: "120px",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenEdit(row)}
              title="Edit carrier"
              aria-label="Edit carrier"
            >
              <FaEdit />
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenDelete(row)}
              title="Delete carrier"
              aria-label="Delete carrier"
            >
              <FaTrash />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "Total",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Active",
        value: summary?.active || 0,
        active: selectedSummaryStatus === true,
        onClick: () => onSummaryCardClick(true),
      },
      {
        label: "Inactive",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === false,
        onClick: () => onSummaryCardClick(false),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus, filters],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Carriers" },
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
        <Button
          type="button"
          className="btn btn--theme"
          onClick={handleOpenCreate}
          disabled={loadingSubmit}
        >
          Create Carrier
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <CarrierFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={carriers || []}
            progressPending={loadingList}
            count={totalRecord || 0}
            params={params}
            setParams={setParams}
            minHeight="500px"
            persistTableHead
            noDataComponent={
              <NoRecordsFound description="No carriers found." />
            }
          />
        </Card.Body>
      </Card>

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDelete}
        title="Delete Carrier"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: handleCloseDelete,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDelete,
            className: "btn btn--danger",
            disabled: loadingSubmit,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Are you sure you want to delete{" "}
          <strong>{selectedCarrier?.name || "this carrier"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  carriersStore: state.carriers,
});

export default connect(mapStateToProps, {
  getCarriersList,
  deleteCarrier,
})(CarriersManagement);
