import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Form, Modal } from "react-bootstrap";

import { uploadClaimEvidenceFile } from "@src/features/orders/utils/claimEvidenceUpload";

const createUploadItem = (file) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
  status: "uploading",
  progress: 0,
  error: "",
});

const ClaimEvidenceUploadField = ({
  orderNo,
  category,
  label,
  value = [],
  onChange,
  minCount = 0,
  maxCount = 10,
  accept,
  disabled = false,
  required = false,
}) => {
  const [uploadItems, setUploadItems] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const inputId = useMemo(
    () => `claim-evidence-${category}-${Math.random().toString(36).slice(2, 8)}`,
    [category],
  );

  const uploadedCount = Array.isArray(value) ? value.length : 0;
  const pendingCount = uploadItems.filter((item) => item.status === "uploading").length;
  const canAddMore = uploadedCount + pendingCount < maxCount;
  const isUploading = pendingCount > 0;

  const updateUploadItem = (itemId, patch) => {
    setUploadItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  };

  const removeUploadItem = (itemId) => {
    setUploadItems((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== itemId);
    });
  };

  const uploadSingleFile = async (item) => {
    try {
      const uploaded = await uploadClaimEvidenceFile(orderNo, item.file, category, {
        onProgress: ({ loaded, total }) => {
          const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
          updateUploadItem(item.id, { progress });
        },
      });
      updateUploadItem(item.id, { status: "success", progress: 100 });
      onChange?.([...(Array.isArray(value) ? value : []), uploaded]);
      removeUploadItem(item.id);
    } catch (err) {
      updateUploadItem(item.id, {
        status: "error",
        progress: 0,
        error: err.message || "Upload failed.",
      });
    }
  };

  const handleFilesSelected = (files) => {
    if (!canAddMore || disabled || isUploading) return;
    const remaining = Math.max(0, maxCount - uploadedCount - pendingCount);
    const selected = Array.from(files || []).slice(0, remaining);
    if (selected.length === 0) return;

    const nextItems = selected.map(createUploadItem);
    setUploadItems((prev) => [...prev, ...nextItems]);
    nextItems.forEach((item) => {
      uploadSingleFile(item);
    });
  };

  const handleRemoveUploaded = (index) => {
    if (disabled || isUploading) return;
    const next = (Array.isArray(value) ? value : []).filter((_, idx) => idx !== index);
    onChange?.(next);
  };

  const handleRetry = (itemId) => {
    const target = uploadItems.find((item) => item.id === itemId);
    if (!target || disabled) return;
    updateUploadItem(itemId, { status: "uploading", progress: 0, error: "" });
    uploadSingleFile(target);
  };

  const helperText =
    category === "images"
      ? minCount > 0
        ? maxCount > minCount
          ? `Upload at least ${minCount} photo(s), up to ${maxCount}.`
          : minCount === maxCount
            ? `Upload exactly ${minCount} photo(s).`
            : `Upload at least ${minCount} photo(s).`
        : `You may upload up to ${maxCount} photo(s).`
      : `Upload supporting file${required ? " (required)" : ""}.`;

  return (
    <div className="claim-evidence-field">
      <div className="claim-evidence-field__head">
        <Form.Label className="form-sub-label mb-0">
          {label}
          {required ? " *" : ""}
        </Form.Label>
        <span className="claim-evidence-field__count">
          {uploadedCount}
          {maxCount ? ` / ${maxCount}` : ""}
        </span>
      </div>
      <p className="claim-evidence-field__hint">{helperText}</p>

      <div className="claim-evidence-field__grid">
        {(Array.isArray(value) ? value : []).map((file, index) => (
          <div key={`${file.key}-${index}`} className="claim-evidence-field__card">
            {String(file.url || "").toLowerCase().includes(".pdf") ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="claim-evidence-field__pdf"
              >
                PDF
              </a>
            ) : (
              <img
                src={file.url}
                alt=""
                className="claim-evidence-field__thumb"
                onClick={() => setPreviewUrl(file.url)}
              />
            )}
            <button
              type="button"
              className="claim-evidence-field__remove"
              onClick={() => handleRemoveUploaded(index)}
              disabled={disabled || isUploading}
              aria-label={`Remove ${label}`}
            >
              ×
            </button>
          </div>
        ))}

        {uploadItems.map((item) => (
          <div
            key={item.id}
            className={`claim-evidence-field__card claim-evidence-field__card--${item.status}`}
          >
            {item.previewUrl ? (
              <img src={item.previewUrl} alt="" className="claim-evidence-field__thumb" />
            ) : (
              <div className="claim-evidence-field__pdf">{item.file?.name || "File"}</div>
            )}
            {item.status === "uploading" ? (
              <div className="claim-evidence-field__progress">
                <div
                  className="claim-evidence-field__progress-bar"
                  style={{ width: `${Math.max(0, Math.min(100, item.progress || 0))}%` }}
                />
              </div>
            ) : null}
            {item.status === "error" ? (
              <button
                type="button"
                className="claim-evidence-field__retry"
                onClick={() => handleRetry(item.id)}
                disabled={disabled}
              >
                Retry
              </button>
            ) : null}
          </div>
        ))}

        {canAddMore ? (
          <>
            <Form.Control
              id={inputId}
              type="file"
              accept={accept}
              multiple={category === "images" || maxCount > 1}
              onChange={(event) => {
                handleFilesSelected(event.target.files);
                event.target.value = "";
              }}
              disabled={disabled || isUploading}
              className="d-none"
            />
            <label
              htmlFor={inputId}
              className={`claim-evidence-field__add${
                disabled || isUploading ? " claim-evidence-field__add--disabled" : ""
              }`}
            >
              <span>+</span>
              <small>Add</small>
            </label>
          </>
        ) : null}
      </div>

      <Modal show={Boolean(previewUrl)} onHide={() => setPreviewUrl("")} centered>
        <Modal.Body className="p-2">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }}
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
};

ClaimEvidenceUploadField.propTypes = {
  orderNo: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func,
  minCount: PropTypes.number,
  maxCount: PropTypes.number,
  accept: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
};

export default ClaimEvidenceUploadField;
