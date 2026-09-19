import { Dropdown } from "react-bootstrap";
import * as Constants from "@src/constants/index";
import {
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
} from "react-icons/md";

const AppPagination = ({ params, setParams, count }) => {
  const { limit, page } = params;
  const totalPages = Math.max(1, Math.ceil(count / limit || 1));
  const startRecord = count === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, count);

  const onSizePerPageChange = (pageSize) => {
    setParams({
      ...params,
      page: 1,
      limit: pageSize,
    });
  };

  const setPage = (page) => {
    setParams({
      ...params,
      page,
    });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="ecom-pagination">
      <div className="ecom-pagination__top">
        <div className="ecom-pagination__page-size">
          <p className="ecom-pagination__label">Records per page</p>
          <Dropdown>
            <Dropdown.Toggle className="ecom-pagination__size-toggle">
              {limit}
            </Dropdown.Toggle>
            <Dropdown.Menu className="ecom-pagination__size-menu">
              {Constants.PAGE_SIZE_OPTIONS.map((option, k) => (
                <Dropdown.Item
                  key={k}
                  className="ecom-pagination__size-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSizePerPageChange(option.page);
                  }}
                >
                  {option.text}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <p className="ecom-pagination__summary">
          {`Showing ${startRecord} - ${endRecord} of ${count} results`}
        </p>
      </div>

      <div className="ecom-pagination__bottom">
        <ul className="ecom-pagination__list">
          <li>
            <button
              type="button"
              className="ecom-pagination__nav ecom-pagination__nav--prev"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <MdOutlineKeyboardDoubleArrowLeft />
            </button>
          </li>
          {getPageNumbers().map((p, index) => (
            <li key={index}>
              {p === "..." ? (
                <span className="ecom-pagination__ellipsis">{p}</span>
              ) : (
                <button
                  type="button"
                  className={`ecom-pagination__page ${p === page ? "is-active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )}
            </li>
          ))}
          <li>
            <button
              type="button"
              className="ecom-pagination__nav ecom-pagination__nav--next"
              onClick={() => setPage(Math.min(page + 1, totalPages))}
              disabled={page === totalPages}
            >
              <MdOutlineKeyboardDoubleArrowRight />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AppPagination;
