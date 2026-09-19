import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const thumbStyle = {
  width: "72px",
  height: "48px",
  objectFit: "cover",
  borderRadius: "4px",
};

const ShowcaseTable = ({
  data,
  loadingList,
  onEdit,
  onDelete,
  params,
  setParams,
}) => {
  const columns = [
    {
      name: "Preview",
      width: "100px",
      cell: (row) => {
        const first = row.images?.[0];
        return first?.url ? (
          <img src={first.url} alt="" style={thumbStyle} />
        ) : (
          <span className="text-muted small">—</span>
        );
      },
    },
    {
      name: "Heading",
      selector: (row) => row.heading,
      sortable: true,
      sortField: "heading",
      minWidth: "200px",
    },
    {
      name: "Images",
      selector: (row) => row.images?.length || 0,
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
      minWidth: "180px",
      cell: (row) => (
        <div className="entity-table-actions entity-table-actions--nowrap">
          <Button
            className="btn btn--outline btn-sm me-2"
            onClick={() => onEdit(row)}
          >
            Edit
          </Button>
          <Button
            className="btn btn--danger btn-sm"
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
            <NoRecordsFound description="No showcase records found." />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default ShowcaseTable;
