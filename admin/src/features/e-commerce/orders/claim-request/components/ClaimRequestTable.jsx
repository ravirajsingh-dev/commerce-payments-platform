import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import {
  claimStatusBadgeClass,
  labelClaimReason,
  labelClaimStatus,
  labelClaimType,
} from "../claimRequestHelpers";

const ClaimRequestTable = ({
  data,
  count,
  loadingList,
  params,
  setParams,
  onManage,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Order",
        selector: (row) => row.orderNo,
        sortable: true,
        sortField: "orderNo",
        minWidth: "160px",
        cell: (row) => (
          <button
            type="button"
            className="btn btn-link p-0 text-start admin-order-link claim-request-table__order"
            onClick={() => onManage(row)}
          >
            {row.orderNo}
          </button>
        ),
      },
      {
        name: "Type",
        selector: (row) => row.type,
        minWidth: "110px",
        cell: (row) => labelClaimType(row.type),
      },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        sortField: "status",
        minWidth: "140px",
        cell: (row) => (
          <span className={claimStatusBadgeClass(row.status)}>{labelClaimStatus(row.status)}</span>
        ),
      },
      {
        name: "Reason",
        minWidth: "180px",
        cell: (row) => labelClaimReason(row.customer?.reasonCode),
      },
      {
        name: "Requested",
        selector: (row) => row.customer?.requestedAt || row.createdAt,
        sortable: true,
        sortField: "requestedAt",
        minWidth: "170px",
        cell: (row) => {
          const at = row.customer?.requestedAt || row.createdAt;
          return (
            <span className="claim-request-table__date">
              {at ? new Date(at).toLocaleString() : "—"}
            </span>
          );
        },
      },
      {
        name: "Actions",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--wrap claim-request-table__actions">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn"
              onClick={() => onManage(row)}
            >
              Manage
            </Button>
          </div>
        ),
      },
    ],
    [onManage],
  );

  return (
    <Card className="common-panel-card">
      <Card.Body>
        <CustomDataTable
          columns={columns}
          data={data || []}
          progressPending={loadingList}
          count={count || 0}
          params={params}
          setParams={setParams}
          minHeight="480px"
          persistTableHead
          noDataComponent={<NoRecordsFound description="No claim requests found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default ClaimRequestTable;
