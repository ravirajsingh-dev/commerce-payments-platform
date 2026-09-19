import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const thumbStyle = {
  width: "72px",
  height: "48px",
  objectFit: "cover",
  borderRadius: "4px",
};

const SignatureStyleTable = ({
  data,
  loadingList,
  onEdit,
  onDelete,
  params,
  setParams,
}) => {
  const columns = [
    {
      name: "Image",
      width: "100px",
      cell: (row) =>
        row.image ? (
          <img src={row.image} alt="" style={thumbStyle} />
        ) : (
          <span className="text-muted small">—</span>
        ),
    },
    {
      name: "Heading",
      selector: (row) => row.title,
      sortable: true,
      sortField: "title",
      minWidth: "160px",
    },
    {
      name: "Product",
      minWidth: "160px",
      cell: (row) =>
        row.productId?.name ? (
          <span>{row.productId.name}</span>
        ) : (
          <span className="text-muted small">—</span>
        ),
    },
    {
      name: "Order",
      selector: (row) => row.order ?? 0,
      sortable: true,
      sortField: "order",
      width: "100px",
    },
    {
      name: "Status",
      width: "120px",
      cell: (row) => (
        <span
          className={`entity-status entity-status--${row.isActive ? "active" : "inactive"} px-2 py-1 rounded-2 small`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      name: "Actions",
      minWidth: "220px",
      cell: (row) => (
        <div className="entity-table-actions entity-table-actions--nowrap d-flex gap-2 flex-wrap align-items-center">
          <Button
            className="btn btn--outline btn-sm"
            style={{ minWidth: "88px" }}
            onClick={() => onEdit(row)}
          >
            Edit
          </Button>
          <Button
            className="btn btn--danger btn-sm"
            style={{ minWidth: "88px" }}
            onClick={() => onDelete(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card className="common-panel-card">
      <Card.Body>
        <CustomDataTable
          columns={columns}
          data={data || []}
          progressPending={loadingList}
          count={(data || []).length}
          params={params}
          setParams={setParams}
          minHeight="360px"
          noDataComponent={
            <NoRecordsFound description="No signature styles found." />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default SignatureStyleTable;
