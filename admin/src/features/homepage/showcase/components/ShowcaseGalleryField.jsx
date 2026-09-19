import { useState } from "react";
import { Col, Form, Modal, Row } from "react-bootstrap";
import Errors from "@src/notifications/Errors";

const CARD = 132;

const ShowcaseGalleryField = ({
  uploadItems = [],
  onUploadImages,
  onRetryImageUpload,
  onRemoveImageUpload,
  uploadingImages = false,
  imagesError = "",
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  return (
    <Row className="g-3">
      <Col md={12}>
        <h6 className="mb-1 mt-2">Gallery images (carousel) *</h6>
      </Col>
      <Col md={12}>
        <Form.Group>
          <Form.Control
            id="showcase-gallery-image-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={(e) => onUploadImages(Array.from(e.target.files || []))}
            disabled={uploadingImages}
            className="d-none"
          />
          <div className="small text-light opacity-75">
            {uploadingImages
              ? "Uploading images..."
              : "You can upload multiple images."}
          </div>
        </Form.Group>

        <div className="small text-light opacity-75 mt-2">
          {(uploadItems || []).filter((item) => item.status === "success").length}{" "}
          / {(uploadItems || []).length} images selected
        </div>

        <div className="d-flex flex-wrap gap-3 mt-2">
          {(uploadItems || []).map((image) => (
            <div
              key={image.id}
              className={`position-relative rounded overflow-hidden border pv-upload-card ${
                image.status === "error" ? "border-danger" : ""
              }`}
              style={{ width: `${CARD}px` }}
            >
              <img
                src={image.previewUrl || image.url}
                alt=""
                style={{
                  width: `${CARD}px`,
                  height: `${CARD}px`,
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setPreviewImageUrl(image.previewUrl || image.url || "")
                }
              />
              <div className="position-absolute top-0 end-0 p-2">
                <button
                  type="button"
                  className="btn btn-link p-0 text-white text-decoration-none"
                  onClick={() => onRemoveImageUpload?.(image.id)}
                  title="Remove image"
                >
                  ×
                </button>
              </div>

              {image.status === "error" ? (
                <div className="position-absolute top-50 start-50 translate-middle">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-white text-decoration-none"
                      onClick={() => onRetryImageUpload?.(image.id)}
                      title="Retry upload"
                    >
                      ↻
                    </button>
                </div>
              ) : null}

              {image.status === "uploading" ? (
                <div className="position-absolute start-0 end-0 bottom-0 px-2 pb-2">
                  <div className="progress" style={{ height: "5px" }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${Math.max(0, Math.min(100, image.progress || 0))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          <label
            htmlFor="showcase-gallery-image-input"
            className="d-flex align-items-center justify-content-center rounded border border-secondary-subtle text-muted"
            style={{
              width: `${CARD}px`,
              height: `${CARD}px`,
              borderStyle: "dashed",
              cursor: uploadingImages ? "not-allowed" : "pointer",
            }}
          >
            <div className="text-center">
              <div
                className="text-light"
                style={{ fontSize: "20px", lineHeight: 1 }}
              >
                +
              </div>
              <small className="text-light opacity-75">Add Image</small>
            </div>
          </label>
        </div>
        <Errors current_key="images" message={imagesError} />
      </Col>

      <Modal
        show={Boolean(previewImageUrl)}
        onHide={() => setPreviewImageUrl("")}
        centered
      >
        <Modal.Body className="p-2">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt=""
              style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }}
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </Row>
  );
};

export default ShowcaseGalleryField;
