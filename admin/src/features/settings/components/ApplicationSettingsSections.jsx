import { Card, Col, Form, Row, Button } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa";
import Errors from "@src/notifications/Errors";

export const GeneralInformationSection = ({
  formData,
  errorList,
  localErrors,
  isDisabled,
  logoPreview,
  onChange,
  onLogoChange,
}) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>General Information</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Full Name *</Form.Label>
            <Form.Control
              className={errorList.name ? "invalid" : ""}
              name="name"
              value={formData.name}
              onChange={onChange}
              disabled={isDisabled}
              required
            />
            <Errors current_key="name" message={localErrors.name} />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Abbreviation</Form.Label>
            <Form.Control
              name="abbreviation"
              value={formData.abbreviation}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g., Rajwada"
            />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Contact Us *</Form.Label>
            <Form.Control
              className={errorList.contactUs ? "invalid" : ""}
              name="contactUs"
              value={formData.contactUs}
              onChange={onChange}
              disabled={isDisabled}
              required
            />
            <Errors current_key="contactUs" message={localErrors.contactUs} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Email *</Form.Label>
            <Form.Control
              className={errorList.email ? "invalid" : ""}
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              disabled={isDisabled}
              required
            />
            <Errors current_key="email" message={localErrors.email} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="address"
              value={formData.address}
              onChange={onChange}
              disabled={isDisabled}
            />
          </Form.Group>
        </Col>
        <Col md={8}>
          <Form.Group>
            <Form.Label>Application Logo</Form.Label>
            {logoPreview ? (
              <div className="common-settings__logo-preview mb-2">
                <img src={logoPreview} alt="Logo preview" />
              </div>
            ) : null}
            <Form.Control
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onLogoChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">JPG/PNG/WEBP, max 2MB.</Form.Text>
            <Errors current_key="logo" />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const SocialMediaSection = ({ formData, isDisabled, onChange }) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>Social Media Links</Card.Header>
    <Card.Body>
      <Row className="g-3">
        {[
          ["Instagram URL", "socialMedia.instagram", "https://instagram.com/..."],
          ["Facebook URL", "socialMedia.facebook", "https://facebook.com/..."],
          ["YouTube URL", "socialMedia.youtube", "https://youtube.com/..."],
          ["Zoom Meeting URL", "socialMedia.zoomMeeting", "https://zoom.us/j/..."],
        ].map(([label, key, placeholder]) => (
          <Col md={6} key={key}>
            <Form.Group>
              <Form.Label>{label}</Form.Label>
              <Form.Control
                type="url"
                name={key}
                value={
                  key.split(".").reduce((acc, part) => acc?.[part], formData) || ""
                }
                onChange={onChange}
                placeholder={placeholder}
                disabled={isDisabled}
              />
            </Form.Group>
          </Col>
        ))}
      </Row>
    </Card.Body>
  </Card>
);

export const CommerceSettingsSection = ({
  formData,
  isDisabled,
  onChange,
  localErrors = {},
}) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>Commerce</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Flat shipping fee (INR)</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step={1}
              name="flatShippingFee"
              value={formData.flatShippingFee ?? 0}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              Applied at checkout until zone-based shipping is enabled.
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>GSTIN (optional)</Form.Label>
            <Form.Control
              className={localErrors.gstin ? "invalid" : ""}
              name="gstin"
              value={formData.gstin ?? ""}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="15-character GSTIN"
              maxLength={15}
            />
            <Form.Text className="text-muted">
              Shown on invoices when set. Leave blank if not registered.
            </Form.Text>
            <Errors current_key="gstin" message={localErrors.gstin} />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Default GST rate (%)</Form.Label>
            <Form.Control
              className={localErrors.defaultGstRate ? "invalid" : ""}
              type="number"
              min={0}
              max={100}
              step={0.01}
              name="defaultGstRate"
              value={formData.defaultGstRate ?? 0}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              Applied at checkout on taxable amount (subtotal minus discount). 0 disables GST.
            </Form.Text>
            <Errors
              current_key="defaultGstRate"
              message={localErrors.defaultGstRate}
            />
          </Form.Group>
        </Col>
        <Col md={6} lg={4}>
          <Form.Group>
            <Form.Label>Low stock threshold</Form.Label>
            <Form.Control
              className={localErrors.lowStockThreshold ? "invalid" : ""}
              type="number"
              min={0}
              step={1}
              name="lowStockThreshold"
              value={formData.lowStockThreshold ?? 5}
              onChange={onChange}
              disabled={isDisabled}
            />
            <Form.Text className="text-muted">
              SKUs at or below this quantity appear on the inventory alerts page.
            </Form.Text>
            <Errors
              current_key="lowStockThreshold"
              message={localErrors.lowStockThreshold}
            />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const AuthenticationSettingsSection = ({
  formData,
  isDisabled,
  onChange,
}) => (
  <Card className="common-panel-card mb-4">
    <Card.Header>Authentication Settings</Card.Header>
    <Card.Body>
      <Row className="g-3">
        <Col md={6}>
          <Form.Check
            type="switch"
            id="loginEnabled"
            name="loginEnabled"
            label="Enable Login"
            checked={formData.loginEnabled}
            onChange={onChange}
            disabled={isDisabled}
          />
        </Col>
        <Col md={6}>
          <Form.Check
            type="switch"
            id="registerEnabled"
            name="registerEnabled"
            label="Enable Registration"
            checked={formData.registerEnabled}
            onChange={onChange}
            disabled={isDisabled}
          />
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

export const AboutUsSection = ({
  formData,
  isDisabled,
  onChange,
  addAboutSection,
  removeAboutSection,
  moveAboutSection,
  onAboutSectionField,
  onAboutSectionImageChange,
  clearAboutSectionImage,
}) => {
  const sections = formData.aboutUs?.sections || [];

  return (
    <Card className="common-panel-card mb-4 about-us-admin">
      <Card.Header>About Us Page Content</Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          Build your brand story for the storefront — add any number of sections
          (e.g. The Designer, Brand Logo, History) with a heading, image, and
          description.
        </p>
        <Row className="g-3">
          <Col md={12}>
            <Form.Group>
              <Form.Label>Page title</Form.Label>
              <Form.Control
                name="aboutUs.title"
                value={formData.aboutUs.title}
                onChange={onChange}
                disabled={isDisabled}
                placeholder="e.g. About Rajwada"
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Intro text</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="aboutUs.intro"
                value={formData.aboutUs.intro}
                onChange={onChange}
                disabled={isDisabled}
                placeholder="Short introduction shown below the page title…"
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 mt-2">
          <span className="about-us-admin__section-meta mb-0">Story sections</span>
          <Button
            type="button"
            className="btn btn--outline btn-sm"
            onClick={addAboutSection}
            disabled={isDisabled}
          >
            <FaPlus className="me-1" />
            Add section
          </Button>
        </div>

        {sections.map((sec, index) => (
          <div key={sec.id} className="about-us-admin__section">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <span className="about-us-admin__section-meta">
                Section {index + 1}
              </span>
              <div className="d-flex gap-1">
                <Button
                  type="button"
                  className="btn btn--outline btn-sm"
                  disabled={isDisabled || index === 0}
                  onClick={() => moveAboutSection(index, -1)}
                  aria-label="Move up"
                >
                  <FaArrowUp />
                </Button>
                <Button
                  type="button"
                  className="btn btn--outline btn-sm"
                  disabled={isDisabled || index >= sections.length - 1}
                  onClick={() => moveAboutSection(index, 1)}
                  aria-label="Move down"
                >
                  <FaArrowDown />
                </Button>
                <Button
                  type="button"
                  className="btn btn--danger btn-sm"
                  disabled={isDisabled}
                  onClick={() => removeAboutSection(index)}
                  aria-label="Remove section"
                >
                  <FaTrash />
                </Button>
              </div>
            </div>

            <Form.Group className="mb-2">
              <Form.Label>Heading</Form.Label>
              <Form.Control
                type="text"
                value={sec.heading ?? ""}
                onChange={(e) =>
                  onAboutSectionField(index, "heading", e.target.value)
                }
                disabled={isDisabled}
                placeholder="e.g. The Designer, Brand Logo, History"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Image</Form.Label>
              {sec.imagePreview ? (
                <div className="about-us-admin__image-preview mb-2">
                  <img src={sec.imagePreview} alt={sec.heading || "Section"} />
                  {!isDisabled ? (
                    <Button
                      type="button"
                      size="sm"
                      className="btn btn--danger mt-2"
                      onClick={() => clearAboutSectionImage(index)}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Form.Control
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                disabled={isDisabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAboutSectionImageChange(index, file);
                  e.target.value = "";
                }}
              />
              <Form.Text className="text-muted">JPG/PNG/WEBP, max 2MB.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-0">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={sec.description ?? ""}
                onChange={(e) =>
                  onAboutSectionField(index, "description", e.target.value)
                }
                disabled={isDisabled}
                placeholder="Tell your brand story for this section…"
              />
            </Form.Group>
          </div>
        ))}
        <Errors current_key="aboutUs" />
      </Card.Body>
    </Card>
  );
};

export const ContactUsSection = ({ formData, isDisabled, onChange }) => (
  <Card className="common-panel-card mb-4 contact-us-admin">
    <Card.Header>Contact Us Page Content</Card.Header>
    <Card.Body>
      <p className="text-muted small mb-3">
        Configure the storefront Contact Us page — page title, intro, and
        contact details shown to customers (can differ from general settings).
      </p>
      <Row className="g-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Page title</Form.Label>
            <Form.Control
              name="contactUsPage.title"
              value={formData.contactUsPage.title}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g. Contact Rajwada"
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group>
            <Form.Label>Intro text</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="contactUsPage.intro"
              value={formData.contactUsPage.intro}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Short welcome message shown below the page title…"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Primary phone</Form.Label>
            <Form.Control
              name="contactUsPage.phone"
              value={formData.contactUsPage.phone}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g. +91 98765 43210"
            />
            <Form.Text className="text-muted">
              Leave blank to use the general Contact Us number on the storefront.
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Secondary phone (optional)</Form.Label>
            <Form.Control
              name="contactUsPage.secondaryPhone"
              value={formData.contactUsPage.secondaryPhone}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Alternate line or WhatsApp"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Contact email</Form.Label>
            <Form.Control
              type="email"
              name="contactUsPage.email"
              value={formData.contactUsPage.email}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="e.g. hello@example.com"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Business hours (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="contactUsPage.businessHours"
              value={formData.contactUsPage.businessHours}
              onChange={onChange}
              disabled={isDisabled}
              placeholder={"Mon–Sat: 10:00 AM – 7:00 PM\nSun: By appointment"}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group>
            <Form.Label>Contact address</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="contactUsPage.address"
              value={formData.contactUsPage.address}
              onChange={onChange}
              disabled={isDisabled}
              placeholder="Boutique / studio address for visitors"
            />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);
