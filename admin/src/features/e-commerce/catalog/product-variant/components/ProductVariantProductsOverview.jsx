import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";

const ProductVariantProductsOverview = ({
  data = [],
  count = 0,
  loading = false,
  params,
  setParams,
  onViewList,
  onAddVariant,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Product",
        selector: (row) => row.productName,
        sortable: true,
        sortField: "name",
        minWidth: "220px",
        cell: (row) => (
          <span className="users-table__text" title={row.productName || "-"}>
            {row.productName || "-"}
          </span>
        ),
      },
      {
        name: "Variants",
        selector: (row) => Number(row.variantCount || 0),
        minWidth: "120px",
        cell: (row) => Number(row.variantCount || 0),
      },
      {
        name: "Total Stock",
        selector: (row) => Number(row.totalStock || 0),
        minWidth: "140px",
        cell: (row) => Number(row.totalStock || 0),
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
              onClick={() => onViewList?.(row.productId)}
            >
              View List
            </Button>
            <Button
              type="button"
              className="btn btn--theme btn-sm entity-table-actions__btn"
              style={{ minWidth: "112px" }}
              onClick={() => onAddVariant?.(row.productId)}
            >
              + Add Variant
            </Button>
          </div>
        ),
      },
    ],
    [onAddVariant, onViewList],
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
          noDataComponent={<NoRecordsFound description="No products found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default ProductVariantProductsOverview;
