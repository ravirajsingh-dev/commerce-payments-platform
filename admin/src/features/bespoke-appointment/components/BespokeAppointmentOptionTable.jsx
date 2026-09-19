import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const BespokeAppointmentOptionTable = ({
  data,
  loadingList,
  params,
  setParams,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      name: "Label",
      selector: (row) => row.label,
      sortable: true,
      sortField: "label",
      minWidth: "200px",
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
      <Card.Header>Service options (dropdown)</Card.Header>
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
            <NoRecordsFound description="No service options yet. Add Wedding, Sangeet, Reception, etc." />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default BespokeAppointmentOptionTable;
