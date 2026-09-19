import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const thumbStyle = {
  width: "72px",
  height: "48px",
  objectFit: "cover",
  borderRadius: "4px",
};

const HomeSliderTable = ({
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
      selector: (row) => row.heading,
      sortable: true,
      sortField: "heading",
      minWidth: "200px",
    },
    {
      name: "Status",
      width: "120px",
      cell: (row) => (
        <span
          className={`entity-status entity-status--${row.status ? "active" : "inactive"} px-2 py-1 rounded-2 small`}
        >
          {row.status ? "Active" : "Inactive"}
        </span>
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
          noDataComponent={<NoRecordsFound description="No sliders found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default HomeSliderTable;
