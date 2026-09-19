import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatInr } from "@src/features/e-commerce/coupons/couponHelpers";
import {
  getVariantListPrice,
  getVariantSalePrice,
  variantHasDiscount,
} from "@src/features/e-commerce/catalog/product-variant/variantHelpers";

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

const formatAttributesCell = (attributes) => {
  if (!attributes || typeof attributes !== "object") return "-";
  const entries = Object.entries(attributes);
  if (!entries.length) return "-";
  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
};

const ProductVariantTable = ({
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
        name: "Image",
        minWidth: "80px",
        cell: (row) =>
          row.variantThumbUrl ? (
            <img
              src={row.variantThumbUrl}
              alt="Variant"
              style={{
                width: "48px",
                height: "48px",
                objectFit: "cover",
                borderRadius: "6px",
              }}
            />
          ) : (
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "6px",
                background: "#e9ecef",
              }}
            />
          ),
      },
      {
        name: "Name",
        minWidth: "220px",
        grow: 2,
        wrap: true,
        cell: (row) => {
          const text = row.name || row.productName || "-";
          const title = row.name || row.productName || "";
          return (
            <span
              title={title}
              style={{
                display: "block",
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                lineHeight: 1.35,
                paddingRight: "0.75rem",
              }}
            >
              {text}
            </span>
          );
        },
      },
      {
        name: "SKU",
        selector: (row) => row.sku,
        sortable: true,
        sortField: "sku",
        minWidth: "180px",
        grow: 1,
        wrap: true,
        cell: (row) => (
          <span
            title={row.sku}
            style={{
              display: "block",
              whiteSpace: "normal",
              wordBreak: "break-all",
              lineHeight: 1.35,
            }}
          >
            {row.sku}
          </span>
        ),
      },
      {
        name: "Attributes",
        minWidth: "220px",
        cell: (row) => (
          <span
            className="users-table__text"
            title={formatAttributesCell(row.attributes)}
          >
            {formatAttributesCell(row.attributes)}
          </span>
        ),
      },
      {
        name: "Price",
        selector: (row) => getVariantSalePrice(row),
        sortable: true,
        sortField: "price",
        minWidth: "140px",
        cell: (row) => {
          const listPrice = getVariantListPrice(row);
          const salePrice = getVariantSalePrice(row);
          const onSale = variantHasDiscount(row);
          if (!onSale) {
            return <span>{formatInr(listPrice)}</span>;
          }
          return (
            <span className="pv-admin-price">
              <strong>{formatInr(salePrice)}</strong>
              <span className="pv-admin-price__mrp ms-1">
                {formatInr(listPrice)}
              </span>
            </span>
          );
        },
      },
      {
        name: "Stock",
        selector: (row) => row.stock,
        sortable: true,
        sortField: "stock",
        minWidth: "100px",
        cell: (row) => Number(row.stock || 0),
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
        name: "New Arrivals",
        minWidth: "110px",
        cell: (row) => (row.isNewArrival ? "Yes" : "—"),
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
          noDataComponent={
            <NoRecordsFound description="No product variants found." />
          }
        />
      </Card.Body>
    </Card>
  );
};

export default ProductVariantTable;
