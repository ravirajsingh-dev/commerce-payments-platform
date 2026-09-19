import { useMemo } from "react";
import { Button, Card } from "react-bootstrap";
import {
  FaCheck,
  FaEye,
  FaTimes,
  FaTrashAlt,
} from "react-icons/fa";

import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import {
  REVIEW_STATUS_LABELS,
  formatReviewDate,
  formatReviewRating,
  reviewStatusClass,
} from "../reviewHelpers";
import ReviewRatingStars from "./ReviewRatingStars";

const ReviewTable = ({
  data,
  count,
  loadingList,
  params,
  setParams,
  onApprove,
  onReject,
  onDelete,
  onView,
  loadingSubmit,
}) => {
  const columns = useMemo(
    () => [
      {
        name: "Product",
        minWidth: "300px",
        cell: (row) => (
          <div>
            <span className="review-table__primary" title={row.productName || "-"}>
              {row.productName || "-"}
            </span>
            {row.variantSku ? (
              <small className="review-table__meta">SKU {row.variantSku}</small>
            ) : null}
            {row.variantName ? (
              <small className="review-table__meta">{row.variantName}</small>
            ) : null}
          </div>
        ),
      },
      {
        name: "Customer",
        minWidth: "200px",
        cell: (row) => (
          <div>
            <span className="review-table__primary">{row.userName || "-"}</span>
            {row.userEmail ? (
              <small className="review-table__meta" title={row.userEmail}>
                {row.userEmail}
              </small>
            ) : null}
          </div>
        ),
      },
      {
        name: "Rating",
        selector: (row) => row.rating,
        sortable: true,
        sortField: "rating",
        minWidth: "140px",
        cell: (row) => (
          <div className="review-table__rating">
            <ReviewRatingStars rating={row.rating} />
            <span>{formatReviewRating(row.rating)}</span>
          </div>
        ),
      },
      {
        name: "Review",
        minWidth: "240px",
        grow: 2,
        wrap: true,
        cell: (row) => (
          <div className="review-table__review-cell">
            {row.title ? (
              <span className="review-table__review-title">{row.title}</span>
            ) : (
              <span className="review-table__meta">No title</span>
            )}
            {row.comment ? (
              <small className="review-table__comment">{row.comment}</small>
            ) : (
              <small className="review-table__meta">No comment</small>
            )}
          </div>
        ),
      },
      {
        name: "Status",
        sortable: true,
        sortField: "status",
        minWidth: "110px",
        cell: (row) => (
          <span
            className={`badge entity-status entity-status--${reviewStatusClass(row.status)}`}
          >
            {REVIEW_STATUS_LABELS[row.status] || row.status}
          </span>
        ),
      },
      {
        name: "Submitted",
        sortable: true,
        sortField: "createdAt",
        minWidth: "160px",
        cell: (row) => (
          <span className="review-table__date">{formatReviewDate(row.createdAt)}</span>
        ),
      },
      {
        name: "Actions",
        width: "200px",
        minWidth: "200px",
        grow: 0,
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => onView(row)}
              title="View details"
              aria-label="View details"
            >
              <FaEye />
            </Button>
            {row.status !== "approved" ? (
              <Button
                type="button"
                className="btn btn--theme btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
                disabled={loadingSubmit}
                onClick={() => onApprove(row)}
                title="Approve"
                aria-label="Approve"
              >
                <FaCheck />
              </Button>
            ) : null}
            {row.status !== "rejected" ? (
              <Button
                type="button"
                className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
                disabled={loadingSubmit}
                onClick={() => onReject(row)}
                title="Reject"
                aria-label="Reject"
              >
                <FaTimes />
              </Button>
            ) : null}
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              disabled={loadingSubmit}
              onClick={() => onDelete(row)}
              title="Delete"
              aria-label="Delete"
            >
              <FaTrashAlt />
            </Button>
          </div>
        ),
      },
    ],
    [loadingSubmit, onApprove, onDelete, onReject, onView],
  );

  return (
    <Card className="common-panel-card review-table">
      <Card.Body className="p-0">
        <CustomDataTable
          columns={columns}
          data={data}
          count={count}
          params={params}
          setParams={setParams}
          progressPending={loadingList}
          sortServer
          pagination
          persistTableHead
          noDataComponent={<NoRecordsFound description="No reviews found." />}
        />
      </Card.Body>
    </Card>
  );
};

export default ReviewTable;
