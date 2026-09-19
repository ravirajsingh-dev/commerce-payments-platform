import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import {
  fetchMyReviewContext,
  fetchVariantReviews,
} from "@src/features/reviews/reviewActions";
import { EMPTY_RATING_DISTRIBUTION } from "@src/features/public/components/reviewStars";

const DEFAULT_SUMMARY = {
  averageRating: 0,
  reviewCount: 0,
  ratingDistribution: { ...EMPTY_RATING_DISTRIBUTION },
};

const PAGE_SIZE = 10;

const useVariantReviews = (variantId, isAuthenticated) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const sectionRef = useRef(null);

  const loadReviews = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (!variantId) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const reviewsResult = await dispatch(
          fetchVariantReviews(variantId, {
            page,
            limit: PAGE_SIZE,
            sort: "latest",
          }),
        );

        let contextResult = null;
        if (isAuthenticated && !append) {
          contextResult = await dispatch(fetchMyReviewContext(variantId));
        }

        if (reviewsResult?.status) {
          const payload = reviewsResult.data || {};
          const nextReviews = Array.isArray(payload.reviews)
            ? payload.reviews
            : [];
          setReviews((prev) =>
            append ? [...prev, ...nextReviews] : nextReviews,
          );
          setSummary(payload.summary || DEFAULT_SUMMARY);
          setPagination(
            payload.pagination || {
              page: 1,
              limit: PAGE_SIZE,
              total: nextReviews.length,
              totalPages: 1,
            },
          );
        } else if (!append) {
          setReviews([]);
          setSummary(DEFAULT_SUMMARY);
        }

        if (!append && isAuthenticated && contextResult?.status) {
          const ctx = contextResult.data || {};
          setCanReview(Boolean(ctx.canReview));
          setUserReview(ctx.review || null);
        } else if (!append && !isAuthenticated) {
          setCanReview(false);
          setUserReview(null);
        }
      } catch {
        if (!append) {
          setReviews([]);
          setSummary(DEFAULT_SUMMARY);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [variantId, isAuthenticated, dispatch],
  );

  useEffect(() => {
    loadReviews({ page: 1, append: false });
  }, [loadReviews]);

  const loadMore = () => {
    if (loadingMore || loading) return;
    if (pagination.page >= pagination.totalPages) return;
    loadReviews({ page: pagination.page + 1, append: true });
  };

  const onReviewSubmitted = (review) => {
    setUserReview(review);
    setCanReview(false);
  };

  const scrollToReviews = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasMore = pagination.page < pagination.totalPages;

  return {
    loading,
    loadingMore,
    reviews,
    summary,
    pagination,
    canReview,
    userReview,
    onReviewSubmitted,
    reload: () => loadReviews({ page: 1, append: false }),
    loadMore,
    hasMore,
    sectionRef,
    scrollToReviews,
  };
};

export default useVariantReviews;
