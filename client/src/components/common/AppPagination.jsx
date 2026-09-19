import { useEffect, useRef } from "react";
import { Dropdown } from "react-bootstrap";
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
} from "react-icons/md";

import * as Constants from "@src/constants/index";

const VARIANTS = {
  table: {
    pageSizeOptions: Constants.PAGE_SIZE_OPTIONS,
    perPageLabel: "Records per page",
    summaryUnit: "results",
    PrevIcon: MdOutlineKeyboardDoubleArrowLeft,
    NextIcon: MdOutlineKeyboardDoubleArrowRight,
    className: "",
    hideWhenSinglePage: false,
  },
  catalog: {
    pageSizeOptions: Constants.CATALOG_PAGE_SIZE_OPTIONS,
    summaryUnit: "products",
    PrevIcon: MdOutlineKeyboardArrowLeft,
    NextIcon: MdOutlineKeyboardArrowRight,
    className: "ecom-pagination--catalog",
    hideWhenSinglePage: true,
  },
};

const PerPageDropdown = ({
  limit,
  options,
  onChange,
  variant,
  id,
}) => (
  <Dropdown
    className="ecom-pagination__dropdown"
    align="end"
    drop={variant === "catalog" ? "up" : "down"}
  >
    <Dropdown.Toggle
      as="button"
      type="button"
      id={id}
      className="ecom-pagination__link-toggle"
    >
      {limit}
    </Dropdown.Toggle>
    <Dropdown.Menu className="ecom-pagination__size-menu" popperConfig={{ strategy: "fixed" }}>
      {options.map((option) => (
        <Dropdown.Item
          key={option.page}
          className="ecom-pagination__size-item"
          active={option.page === limit}
          onMouseDown={(e) => {
            e.preventDefault();
            onChange(option.page);
          }}
        >
          {option.text}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>
);

const PageControls = ({
  page,
  totalPages,
  getPageNumbers,
  setPage,
  PrevIcon,
  NextIcon,
}) => (
  <ul className="ecom-pagination__list">
    <li>
      <button
        type="button"
        className="ecom-pagination__nav ecom-pagination__nav--prev"
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <PrevIcon aria-hidden />
      </button>
    </li>
    {getPageNumbers().map((p, index) => (
      <li key={`${p}-${index}`}>
        {p === "..." ? (
          <span className="ecom-pagination__ellipsis" aria-hidden>
            {p}
          </span>
        ) : (
          <button
            type="button"
            className={`ecom-pagination__page${p === page ? " is-active" : ""}`}
            onClick={() => setPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
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
        aria-label="Next page"
      >
        <NextIcon aria-hidden />
      </button>
    </li>
  </ul>
);

const AppPagination = ({
  params,
  setParams,
  count,
  variant = "table",
  className = "",
  summaryUnit,
  scrollTargetRef,
  hideWhenSinglePage,
  onPageChange,
}) => {
  const { limit, page } = params;
  const config = VARIANTS[variant] ?? VARIANTS.table;
  const unit = summaryUnit || config.summaryUnit;
  const isCatalog = variant === "catalog";
  const shouldHideSinglePage =
    hideWhenSinglePage ?? config.hideWhenSinglePage ?? false;
  const totalPages = Math.max(1, Math.ceil(count / limit || 1));
  const startRecord = count === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, count);
  const { PrevIcon, NextIcon } = config;
  const prevPageRef = useRef(page);

  useEffect(() => {
    if (prevPageRef.current === page) return;
    prevPageRef.current = page;
    onPageChange?.(page);

    const target = scrollTargetRef?.current;
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }
    if (!target && (isCatalog || scrollTargetRef)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page, scrollTargetRef, onPageChange, isCatalog]);

  if (shouldHideSinglePage && (count === 0 || totalPages <= 1)) {
    return null;
  }

  const onSizePerPageChange = (pageSize) => {
    setParams({
      ...params,
      page: 1,
      limit: pageSize,
    });
  };

  const setPage = (nextPage) => {
    setParams({
      ...params,
      page: nextPage,
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

  const rootClassName = [
    "ecom-pagination",
    config.className,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const summaryText = `Showing ${startRecord}–${endRecord} of ${count} ${unit}`;

  return (
    <nav className={rootClassName} aria-label="Pagination">
      <div className={isCatalog ? "ecom-pagination__meta" : "ecom-pagination__top"}>
        {isCatalog ? (
          <p className="ecom-pagination__summary">{summaryText}</p>
        ) : (
          <div className="ecom-pagination__page-size">
            <p className="ecom-pagination__label">{config.perPageLabel}</p>
            <PerPageDropdown
              limit={limit}
              options={config.pageSizeOptions}
              onChange={onSizePerPageChange}
              variant={variant}
              id={`pagination-size-${variant}`}
            />
          </div>
        )}

        {isCatalog ? (
          <div className="ecom-pagination__per-page">
            <span className="ecom-pagination__per-page-text">Show</span>
            <PerPageDropdown
              limit={limit}
              options={config.pageSizeOptions}
              onChange={onSizePerPageChange}
              variant={variant}
              id="pagination-size-catalog"
            />
            <span className="ecom-pagination__per-page-text">per page</span>
          </div>
        ) : (
          <p className="ecom-pagination__summary">{summaryText}</p>
        )}
      </div>

      <div className="ecom-pagination__bottom">
        <PageControls
          page={page}
          totalPages={totalPages}
          getPageNumbers={getPageNumbers}
          setPage={setPage}
          PrevIcon={PrevIcon}
          NextIcon={NextIcon}
        />
      </div>
    </nav>
  );
};

export default AppPagination;
