import { useMemo } from "react";
import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatInr } from "@src/features/e-commerce/orders/orderHelpers";
import { useClientTableSlice } from "../analyticsTableUtils";

const TopSkusTable = ({ rows = [], params, setParams, loading = false }) => {
  const { data, count } = useClientTableSlice(rows, params, {
    orderBy: "rank",
    ascending: "asc",
  });

  const columns = useMemo(
    () => [
      {
        name: "#",
        selector: (row) => row.rank,
        sortable: true,
        sortField: "rank",
        width: "56px",
        minWidth: "56px",
        cell: (row) => (
          <span className="sales-dashboard-table__rank">{row.rank}</span>
        ),
      },
      {
        name: "Product",
        selector: (row) => row.productName,
        sortable: true,
        sortField: "productName",
        minWidth: "200px",
        grow: 2,
        wrap: true,
        cell: (row) => {
          const label = row.productName || row.variantId;
          return row.productSlug ? (
            <Link
              to={`/admin/product-variants/edit/${encodeURIComponent(row.variantId)}`}
              className="sales-dashboard-table__link sales-dashboard-table__cell-wrap"
              title={label}
            >
              {label}
            </Link>
          ) : (
            <span className="sales-dashboard-table__cell-wrap" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        name: "SKU",
        selector: (row) => row.sku,
        sortable: true,
        sortField: "sku",
        minWidth: "140px",
        grow: 1,
        wrap: true,
        cell: (row) => (
          <span
            className="sales-dashboard-table__cell-wrap sales-dashboard-table__sku"
            title={row.sku || undefined}
          >
            {row.sku || "—"}
          </span>
        ),
      },
      {
        name: "Units sold",
        selector: (row) => row.unitsSold,
        sortable: true,
        sortField: "unitsSold",
        right: true,
        minWidth: "110px",
        cell: (row) => row.unitsSold ?? 0,
      },
      {
        name: "Revenue",
        selector: (row) => row.revenue,
        sortable: true,
        sortField: "revenue",
        right: true,
        minWidth: "120px",
        cell: (row) => (
          <span className="sales-dashboard-table__money">{formatInr(row.revenue)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="entity-table-card sales-dashboard-table-card">
      <Card.Body className="p-0">
        <CustomDataTable
          className="sales-dashboard-table"
          columns={columns}
          data={data}
          count={count}
          params={params}
          setParams={setParams}
          progressPending={loading}
          minHeight="320px"
          persistTableHead
          noDataComponent={
            <NoRecordsFound
              title="No sales data yet"
              description="Top SKUs appear after non-cancelled orders are placed."
              compact
            />
          }
        />
      </Card.Body>
    </Card>
  );
};

TopSkusTable.propTypes = {
  rows: PropTypes.array,
  params: PropTypes.object.isRequired,
  setParams: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default TopSkusTable;
