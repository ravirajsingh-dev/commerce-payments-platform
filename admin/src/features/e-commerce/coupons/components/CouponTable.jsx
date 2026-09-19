import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import {
  COUPON_STATUS_LABELS,
  formatCouponDate,
  formatDiscount,
  formatInr,
  formatPerUserLimit,
  formatUsage,
} from "../couponHelpers";

const CouponTable = ({
  data,
  count,
  loadingList,
  params,
  setParams,
  onEdit,
  onToggleStatus,
  onDelete,
  loadingSubmit,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Code",
        selector: (row) => row.code,
        sortable: true,
        sortField: "code",
        width: "150px",
        minWidth: "150px",
        grow: 0,
        cell: (row) => (
          <span className="coupon-table__code" title={row.code || "-"}>
            {row.code || "-"}
          </span>
        ),
      },
      {
        name: "Title",
        selector: (row) => row.title,
        sortable: true,
        sortField: "title",
        minWidth: "180px",
        cell: (row) => (
          <span className="coupon-table__title" title={row.title || "-"}>
            {row.title || "-"}
          </span>
        ),
      },
      {
        name: "Discount",
        minWidth: "110px",
        cell: (row) => (
          <span className="coupon-table__discount">{formatDiscount(row)}</span>
        ),
      },
      {
        name: "Min cart",
        minWidth: "100px",
        cell: (row) => (
          <span className="coupon-table__meta">
            {formatInr(row.minOrderAmount)}
          </span>
        ),
      },
      {
        name: "Total usage",
        minWidth: "120px",
        cell: (row) => (
          <span className="coupon-table__meta">{formatUsage(row)}</span>
        ),
      },
      {
        name: "Per user",
        minWidth: "100px",
        cell: (row) => (
          <span className="coupon-table__meta">{formatPerUserLimit(row)}</span>
        ),
      },
      {
        name: "Expires",
        sortable: true,
        sortField: "endsAt",
        minWidth: "120px",
        cell: (row) => (
          <span className="coupon-table__meta">
            {formatCouponDate(row.endsAt)}
          </span>
        ),
      },
      {
        name: "Status",
        sortable: true,
        sortField: "status",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-status-cell">
            <span
              className={`badge entity-status entity-status--${Number(row.status) === 1 ? "active" : "inactive"}`}
            >
              {COUPON_STATUS_LABELS[row.status] || "Unknown"}
            </span>
          </div>
        ),
      },
      {
        name: "Actions",
        width: "300px",
        minWidth: "300px",
        grow: 0,
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn"
              onClick={() => onEdit(row)}
            >
              Edit
            </Button>
            <Button
              type="button"
              className={`btn btn-sm entity-table-actions__btn ${
                Number(row.status) === 1 ? "btn--outline" : "btn--theme"
              }`}
              disabled={loadingSubmit}
              onClick={() => onToggleStatus(row)}
            >
              {Number(row.status) === 1 ? "Disable" : "Enable"}
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn"
              disabled={loadingSubmit}
              onClick={() => onDelete(row)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [loadingSubmit, onDelete, onEdit, onToggleStatus],
  );

  return (
    <Card className="common-panel-card coupon-table">
      <Card.Body>
        <CustomDataTable
          columns={columns}
          data={data || []}
          progressPending={loadingList}
          count={count || 0}
          params={params}
          setParams={setParams}
          minHeight="500px"
          persistTableHead
          noDataComponent={<NoRecordsFound description="No coupons found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default CouponTable;
