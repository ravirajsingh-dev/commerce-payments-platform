import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const ClaimPolicyTable = ({
  data,
  count,
  loadingList,
  params,
  setParams,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Code",
        selector: (row) => row.code,
        sortable: true,
        sortField: "code",
        minWidth: "140px",
      },
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        sortField: "name",
        minWidth: "220px",
      },
      {
        name: "Products",
        minWidth: "100px",
        cell: (row) => row.productCount ?? 0,
      },
      {
        name: "Window",
        minWidth: "120px",
        cell: (row) => `${Number(row?.eligibility?.claimWindowDays ?? 0)} day(s)`,
      },
      {
        name: "Types",
        minWidth: "220px",
        cell: (row) => (row?.eligibility?.allowedClaimTypes || []).join(", ") || "all",
      },
      {
        name: "Status",
        minWidth: "120px",
        cell: (row) => (
          <span className={`badge entity-status entity-status--${row.isActive ? "active" : "inactive"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        name: "Actions",
        minWidth: "300px",
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
                row.isActive ? "btn--outline" : "btn--theme"
              }`}
              onClick={() => onToggle(row)}
            >
              {row.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn"
              onClick={() => onDelete(row)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit, onToggle],
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
          noDataComponent={<NoRecordsFound description="No claim policies found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default ClaimPolicyTable;
