import PropTypes from "prop-types";
import { useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { uploadAdminClaimEvidenceFile } from "../utils/adminClaimEvidenceUpload";

const AdminClaimEvidenceUploadField = ({
  orderNo,
  category = "images",
  label = "Images",
  value = [],
  onChange,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxCount = 10,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const files = Array.isArray(value) ? value : [];

  const handleSelect = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || !orderNo) return;
    if (files.length + selected.length > maxCount) {
      setError(`Maximum ${maxCount} files allowed.`);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of selected) {
        const row = await uploadAdminClaimEvidenceFile(orderNo, file, category);
        uploaded.push(row);
      }
      onChange?.([...files, ...uploaded]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    onChange?.(files.filter((_, idx) => idx !== index));
  };

  return (
    <div className="admin-claim-evidence-upload">
      <div className="admin-claim-evidence-upload__head">
        <Form.Label className="mb-0">{label}</Form.Label>
        <span className="admin-claim-evidence-upload__count">
          {files.length}/{maxCount}
        </span>
      </div>
      <div className="admin-claim-evidence-upload__grid">
        {files.map((file, index) => (
          <div key={`${file.key}-${index}`} className="admin-claim-evidence-upload__card">
            <span className="admin-claim-evidence-upload__name">{file.label || "File"}</span>
            <Button
              type="button"
              size="sm"
              variant="outline-danger"
              onClick={() => removeFile(index)}
              disabled={disabled || uploading}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={handleSelect}
        disabled={disabled || uploading || files.length >= maxCount}
      />
      <Button
        type="button"
        className="btn btn--outline btn-sm mt-2"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || !orderNo || files.length >= maxCount}
      >
        {uploading ? "Uploading…" : "Add files"}
      </Button>
      {error ? <p className="admin-claim-evidence-upload__error">{error}</p> : null}
    </div>
  );
};

AdminClaimEvidenceUploadField.propTypes = {
  orderNo: PropTypes.string,
  category: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.array,
  onChange: PropTypes.func,
  accept: PropTypes.string,
  maxCount: PropTypes.number,
  disabled: PropTypes.bool,
};

export default AdminClaimEvidenceUploadField;
