import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const STATUS_LABEL_MAP = {
  1: "Active",
  2: "Draft",
  3: "Inactive",
};

const getStatusClassName = (status) => {
  if (Number(status) === 1) return "active";
  if (Number(status) === 2) return "draft";
  return "inactive";
};

const ProductTable = ({
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
        cell: (row) => (
          <span className="users-table__text" title={row.name || "-"}>
            {row.name || "-"}
          </span>
        ),
      },
      {
        name: "Slug",
        selector: (row) => row.slug,
        sortable: true,
        sortField: "slug",
        minWidth: "180px",
      },
      {
        name: "Category",
        selector: (row) => row.primaryCategoryName || "",
        minWidth: "180px",
        cell: (row) => row.primaryCategoryName || "-",
      },
      {
        name: "Status",
        sortable: true,
        sortField: "status",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-status-cell">
            <span
              className={`badge entity-status entity-status--${getStatusClassName(row.status)}`}
            >
              {STATUS_LABEL_MAP[row.status] || "Unknown"}
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
          noDataComponent={<NoRecordsFound description="No products found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default ProductTable;
