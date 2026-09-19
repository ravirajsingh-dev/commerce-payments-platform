import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const AttributeTable = ({
  data,
  count,
  loadingList,
  params,
  setParams,
  onEdit,
  onDelete,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        sortField: "name",
        minWidth: "180px",
      },
      {
        name: "Code",
        selector: (row) => row.code,
        sortable: true,
        sortField: "code",
        minWidth: "180px",
      },
      {
        name: "Attribute Set",
        selector: (row) => row.attributeSetName || "",
        minWidth: "180px",
        cell: (row) => row.attributeSetName || "-",
      },
      {
        name: "Input Type",
        selector: (row) => row.inputType || "",
        sortable: true,
        sortField: "inputType",
        minWidth: "140px",
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
        minWidth: "190px",
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
              className="btn btn--danger btn-sm entity-table-actions__btn"
              onClick={() => onDelete(row)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit],
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
          minHeight="500px"
          persistTableHead
          noDataComponent={<NoRecordsFound description="No attributes found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default AttributeTable;
