import { useMemo } from "react";
import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatInr } from "@src/features/e-commerce/orders/orderHelpers";
import { useClientTableSlice } from "../analyticsTableUtils";

const TopCustomersTable = ({ rows = [], params, setParams, loading = false }) => {
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
        name: "Customer",
        selector: (row) => row.name || row.email,
        sortable: true,
        sortField: "name",
        minWidth: "180px",
        grow: 2,
        cell: (row) => (
          <div className="sales-dashboard-table__customer">
            <Link
              to={`/admin/users/${encodeURIComponent(row.userId)}/edit`}
              className="sales-dashboard-table__link"
            >
              {row.name || row.email || row.userId}
            </Link>
            {row.email ? (
              <span className="sales-dashboard-table__sub">{row.email}</span>
            ) : null}
          </div>
        ),
      },
      {
        name: "Orders",
        selector: (row) => row.orderCount,
        sortable: true,
        sortField: "orderCount",
        right: true,
        minWidth: "90px",
        cell: (row) => row.orderCount ?? 0,
      },
      {
        name: "Spent",
        selector: (row) => row.totalSpent,
        sortable: true,
        sortField: "totalSpent",
        right: true,
        minWidth: "120px",
        cell: (row) => (
          <span className="sales-dashboard-table__money">{formatInr(row.totalSpent)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="entity-table-card sales-dashboard-table-card h-100">
      <Card.Body className="p-0">
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={params}
          setParams={setParams}
          progressPending={loading}
          minHeight="280px"
          persistTableHead
          noDataComponent={
            <NoRecordsFound
              title="No customer sales in range"
              description="Top customers appear when orders exist for the selected period."
              compact
            />
          }
        />
      </Card.Body>
    </Card>
  );
};

TopCustomersTable.propTypes = {
  rows: PropTypes.array,
  params: PropTypes.object.isRequired,
  setParams: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default TopCustomersTable;
