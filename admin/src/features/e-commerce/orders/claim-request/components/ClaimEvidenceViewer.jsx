import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card, Modal } from "react-bootstrap";

const CLAIM_EVIDENCE_SECTIONS = [
  { key: "images", label: "Photos" },
  { key: "courierReceipt", label: "Courier receipt" },
];

const isPdfFile = (file = {}) => {
  const url = String(file.url || "").toLowerCase();
  const label = String(file.label || "").toLowerCase();
  return url.includes(".pdf") || label.endsWith(".pdf");
};

const ClaimEvidenceViewer = ({ claim = {} }) => {
  const [previewUrl, setPreviewUrl] = useState("");

  const sections = useMemo(
    () =>
      CLAIM_EVIDENCE_SECTIONS.map((section) => ({
        ...section,
        files: Array.isArray(claim?.[section.key]) ? claim[section.key] : [],
      })).filter((section) => section.files.length > 0),
    [claim],
  );

  if (sections.length === 0) {
    return (
      <Card className="common-panel-card mb-3">
        <Card.Header>
          <Card.Title as="h6" className="mb-0">
            Customer evidence
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <p className="mb-0 claim-request-empty-hint">No evidence uploaded for this claim.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="common-panel-card mb-3">
        <Card.Header>
          <Card.Title as="h6" className="mb-0">
            Customer evidence
          </Card.Title>
        </Card.Header>
        <Card.Body>
          {sections.map((section) => (
            <div key={section.key} className="claim-evidence-viewer__section">
              <p className="claim-evidence-viewer__label">{section.label}</p>
              <div className="claim-evidence-viewer__grid">
                {section.files.map((file, index) => (
                  <div key={`${file.key || file.url}-${index}`} className="claim-evidence-viewer__card">
                    {isPdfFile(file) ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="claim-evidence-viewer__pdf"
                      >
                        PDF
                        {file.label ? <span>{file.label}</span> : null}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="claim-evidence-viewer__thumb-btn"
                        onClick={() => setPreviewUrl(file.url)}
                      >
                        <img src={file.url} alt="" className="claim-evidence-viewer__thumb" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Modal show={Boolean(previewUrl)} onHide={() => setPreviewUrl("")} centered size="lg">
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
    </>
  );
};

ClaimEvidenceViewer.propTypes = {
  claim: PropTypes.object,
};

export default ClaimEvidenceViewer;
