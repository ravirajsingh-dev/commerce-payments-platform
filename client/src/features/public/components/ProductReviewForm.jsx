import { useState } from "react";
import { connect } from "react-redux";
import { Form, Button } from "react-bootstrap";
import { FaStar } from "react-icons/fa";

import { submitProductReview } from "@src/features/reviews/reviewActions";

const STAR_VALUES = [1, 2, 3, 4, 5];

const ProductReviewForm = ({ variantId, onSubmitted, submitProductReview }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const displayRating = hoverRating || rating;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitProductReview({
        productVariantId: variantId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      if (result?.status) {
        onSubmitted?.(result.data?.review);
        setRating(0);
        setTitle("");
        setComment("");
      } else {
        setError(result?.message || "Unable to submit review.");
      }
    } catch (err) {
      setError(err?.message || "Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form className="product-reviews__form" onSubmit={onSubmit}>
      <p className="product-reviews__form-title">Write a review</p>
      <div className="product-reviews__stars-input" role="group" aria-label="Rating">
        {STAR_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            className={`product-reviews__star-btn${
              value <= displayRating ? " product-reviews__star-btn--active" : ""
            }`}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
          >
            <FaStar aria-hidden />
          </button>
        ))}
      </div>
      <Form.Group className="mb-3">
        <Form.Label>Title (optional)</Form.Label>
        <Form.Control
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          disabled={submitting}
          placeholder="Summarize your experience"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Your review (optional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1500}
          disabled={submitting}
          placeholder="Share details about fit, fabric, or craftsmanship…"
        />
      </Form.Group>
      {error ? <p className="product-reviews__form-error">{error}</p> : null}
      <Button type="submit" className="btn btn--theme" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </Form>
  );
};

export default connect(null, { submitProductReview })(ProductReviewForm);
