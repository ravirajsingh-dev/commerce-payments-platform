import { useMemo } from "react";
import RDT from "react-data-table-component";
import BouncingLoader from "../Loaders/BouncingLoader";
import NoRecordsFound from "../NoRecordsFound/NoRecordsFound";

const DataTable = RDT?.default?.default ?? RDT?.default ?? RDT;
import AppPagination from "../AppPagination";
import { DEFAULT_PAGE_SIZE } from "@src/constants";

/**
 * Columns may use `minWidth` / `maxWidth` as documented by react-data-table-component.
 * The table library forwards those keys to DOM nodes under React 19, so we translate
 * them to `width` + `style` before passing columns through.
 */
const normalizeColumns = (columns = []) =>
  (columns || []).map((col) => {
    const { minWidth, maxWidth, style: columnStyle, width, ...rest } = col;
    const style = { ...(columnStyle || {}) };
    let nextWidth = width;
    if (minWidth) {
      style.minWidth = minWidth;
      if (!nextWidth) nextWidth = minWidth;
    }
    if (maxWidth) {
      style.maxWidth = maxWidth;
    }
    return {
      ...rest,
      ...(nextWidth ? { width: nextWidth } : {}),
      ...(Object.keys(style).length > 0 ? { style } : {}),
    };
  });

const CustomPagination = ({ paginationComponentOptions }) => {
  const { count, params, setParams } = paginationComponentOptions || {};
  return <AppPagination count={count} params={params} setParams={setParams} />;
};

const CustomDataTable = ({
  count,
  params,
  setParams,
  minHeight,
  noDataComponent = <NoRecordsFound compact />,
  customStyles,
  paginationPerPage,
  columns,
  ...rest
}) => {
  const safeColumns = useMemo(
    () => normalizeColumns(columns),
    [columns],
  );

  const mergedCustomStyles = useMemo(
    () => ({
      ...(customStyles || {}),
      noData: {
        ...(customStyles?.noData || {}),
        style: {
          ...(customStyles?.noData?.style || {}),
          backgroundColor: "transparent",
          color: "inherit",
        },
      },
    }),
    [customStyles],
  );

  const handleSort = (column, sortOrder) => {
    const sortField = column?.sortField || "";
    setParams({
      ...params,
      orderBy: sortField,
      ascending: sortOrder,
    });
  };

  return (
    <DataTable
      columns={safeColumns}
      onSort={handleSort}
      sortServer
      pagination
      paginationComponent={CustomPagination}
      paginationComponentOptions={{ count, params, setParams }}
      progressComponent={
        <BouncingLoader
          minHeight={minHeight || "500px"}
          className="data-table-progress"
        />
      }
      noDataComponent={noDataComponent}
      customStyles={mergedCustomStyles}
      paginationPerPage={
        paginationPerPage ?? params?.limit ?? DEFAULT_PAGE_SIZE
      }
      {...rest}
    />
  );
};

export default CustomDataTable;
