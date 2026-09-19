import { useMemo } from "react";
import { Card } from "react-bootstrap";
import PropTypes from "prop-types";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatInr } from "@src/features/e-commerce/orders/orderHelpers";
import { useClientTableSlice } from "../analyticsTableUtils";

const GmvByPeriodTable = ({
  rows = [],
  periodLabel = "Period",
  params,
  setParams,
  loading = false,
}) => {
  const { data, count } = useClientTableSlice(rows, params, {
    orderBy: "period",
    ascending: "desc",
  });

  const columns = useMemo(
    () => [
      {
        name: periodLabel,
        selector: (row) => row.period,
        sortable: true,
        sortField: "period",
        minWidth: "140px",
        grow: 2,
        cell: (row) => (
          <span className="users-table__text" title={row.period || "—"}>
            {row.period || "—"}
          </span>
        ),
      },
      {
        name: "Orders",
        selector: (row) => row.orderCount,
        sortable: true,
        sortField: "orderCount",
        right: true,
        minWidth: "100px",
        cell: (row) => row.orderCount ?? 0,
      },
      {
        name: "GMV",
        selector: (row) => row.gmv,
        sortable: true,
        sortField: "gmv",
        right: true,
        minWidth: "130px",
        cell: (row) => (
          <span className="sales-dashboard-table__money">{formatInr(row.gmv)}</span>
        ),
      },
    ],
    [periodLabel],
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
              title="No sales in range"
              description="GMV by period appears when orders exist for the selected dates."
              compact
            />
          }
        />
      </Card.Body>
    </Card>
  );
};

GmvByPeriodTable.propTypes = {
  rows: PropTypes.array,
  periodLabel: PropTypes.string,
  params: PropTypes.object.isRequired,
  setParams: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default GmvByPeriodTable;
