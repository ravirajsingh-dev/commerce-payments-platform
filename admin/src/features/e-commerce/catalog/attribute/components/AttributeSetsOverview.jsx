import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const AttributeSetsOverview = ({
  data = [],
  count = 0,
  loading = false,
  params,
  setParams,
  onViewList,
  onAddAttribute,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Attribute Set",
        selector: (row) => row.attributeSetName,
        sortable: true,
        sortField: "name",
        minWidth: "220px",
        cell: (row) => (
          <span className="users-table__text" title={row.attributeSetName || "-"}>
            {row.attributeSetName || "-"}
          </span>
        ),
      },
      {
        name: "Attributes",
        selector: (row) => Number(row.attributeCount || 0),
        minWidth: "120px",
        cell: (row) => Number(row.attributeCount || 0),
      },
      {
        name: "Inactive",
        selector: (row) => Number(row.inactiveCount || 0),
        minWidth: "120px",
        cell: (row) => Number(row.inactiveCount || 0),
      },
      {
        name: "Actions",
        minWidth: "300px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn"
              style={{ minWidth: "96px" }}
              onClick={() => onViewList?.(row.attributeSetId)}
            >
              View List
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn-sm entity-table-actions__btn"
              style={{ minWidth: "118px" }}
              onClick={() => onAddAttribute?.(row.attributeSetId)}
            >
              + Add Attribute
            </Button>
          </div>
        ),
      },
    ],
    [onAddAttribute, onViewList],
  );

  return (
    <Card className="common-panel-card">
      <Card.Body>
        <CustomDataTable
          columns={columns}
          data={data || []}
          progressPending={loading}
          count={count || 0}
          params={params}
          setParams={setParams}
          minHeight="500px"
          persistTableHead
          noDataComponent={
            <NoRecordsFound description="No attribute sets found." />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default AttributeSetsOverview;
