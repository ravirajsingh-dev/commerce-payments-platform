import { useMemo } from "react";
import { Button } from "react-bootstrap";
import { FaEdit, FaTrash } from "react-icons/fa";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import AppPagination from "@src/components/common/AppPagination";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatOrderDateTime, label } from "../orderHelpers";

const OrderShipmentEventsList = ({
  events,
  pagination,
  params,
  setParams,
  loading,
  disabled = false,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "When",
        minWidth: "170px",
        cell: (row) => formatOrderDateTime(row.eventAt),
      },
      {
        name: "Status",
        minWidth: "140px",
        cell: (row) => (
          <span className={`badge admin-order-status admin-order-status--${row.status}`}>
            {label(row.status)}
          </span>
        ),
      },
      {
        name: "Message",
        minWidth: "220px",
        cell: (row) => row.message,
      },
      {
        name: "Location",
        minWidth: "140px",
        cell: (row) => row.location || "—",
      },
      {
        name: "Internal Note",
        minWidth: "200px",
        cell: (row) =>
          row.note ? (
            <span className="admin-order-shipment__event-note">{row.note}</span>
          ) : (
            "—"
          ),
      },
      {
        name: "Actions",
        minWidth: "150px",
        cell: (row) => (
          <div className="admin-order-shipment__event-actions">
            <Button
              type="button"
              className="btn btn--outline btn-sm me-1"
              title="Edit event"
              disabled={disabled}
              onClick={() => onEdit?.(row)}
            >
              <FaEdit />
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm"
              title="Delete event"
              disabled={disabled}
              onClick={() => onDelete?.(row)}
            >
              <FaTrash />
            </Button>
          </div>
        ),
      },
    ],
    [disabled, onDelete, onEdit],
  );

  return (
    <div className="admin-order-shipment__events">
      <CustomDataTable
        columns={columns}
        data={events || []}
        pagination={false}
        sortServer={false}
        progressPending={loading}
        count={pagination?.total || 0}
        params={params}
        setParams={setParams}
        persistTableHead
        noDataComponent={
          <NoRecordsFound
            description="No tracking events yet. Add the first update below."
            compact
          />
        }
      />
      {(pagination?.total || 0) > 0 ? (
        <AppPagination params={params} setParams={setParams} count={pagination.total} />
      ) : null}
    </div>
  );
};

export default OrderShipmentEventsList;
