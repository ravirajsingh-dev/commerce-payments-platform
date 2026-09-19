import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const COLUMN_LABELS = {
  0: "Column 1",
  1: "Column 2",
  2: "Column 3",
};

const STATUS_LABEL_MAP = { 1: "Active", 2: "Inactive" };

const StoreNavSectionTable = ({
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
        name: "Heading",
        selector: (row) => row.title,
        sortable: true,
        sortField: "title",
        minWidth: "200px",
        cell: (row) => (
          <span className="users-table__text" title={row.title || "-"}>
            {row.title || "-"}
          </span>
        ),
      },
      {
        name: "Column",
        selector: (row) => row.columnIndex,
        sortable: true,
        sortField: "columnIndex",
        minWidth: "120px",
        cell: (row) => COLUMN_LABELS[row.columnIndex] || `Column ${row.columnIndex + 1}`,
      },
      {
        name: "Products",
        selector: (row) => row.productCount,
        minWidth: "100px",
        cell: (row) => row.productCount ?? (row.productIds?.length || 0),
      },
      {
        name: "Status",
        sortable: true,
        sortField: "status",
        minWidth: "110px",
        cell: (row) => (
          <span
            className={`badge entity-status entity-status--${Number(row.status) === 1 ? "active" : "inactive"}`}
          >
            {STATUS_LABEL_MAP[row.status] || "Unknown"}
          </span>
        ),
      },
      {
        name: "Sort",
        selector: (row) => row.sortOrder,
        sortable: true,
        sortField: "sortOrder",
        minWidth: "80px",
      },
      {
        name: "Actions",
        minWidth: "180px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn px-3 py-2"
              onClick={() => onEdit(row)}
            >
              Edit
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn px-3 py-2"
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
    <Card className="entity-table-card">
      <Card.Body className="p-0">
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={params}
          setParams={setParams}
          progressPending={loadingList}
          noDataComponent={
            <NoRecordsFound
              title="No menu sections"
              description="Create headings like Shop By Collection and assign products."
            />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default StoreNavSectionTable;
