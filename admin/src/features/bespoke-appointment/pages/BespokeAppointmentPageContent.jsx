import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { FaRegEye } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import {
  getBespokeSettings,
  updateBespokeSettings,
} from "../bespokeAppointmentActions";

const emptyForm = {
  pageTitle: "",
  introLine: "",
  description: "",
  formHeading: "",
  isActive: true,
};

const BespokeAppointmentPageContent = ({
  store,
  getBespokeSettings,
  updateBespokeSettings,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [isDisabled, setDisabled] = useState(true);

  useEffect(() => {
    getBespokeSettings();
  }, [getBespokeSettings]);

  useEffect(() => {
    if (store.settings) {
      setFormData({
        pageTitle: store.settings.pageTitle || "",
        introLine: store.settings.introLine || "",
        description: store.settings.description || "",
        formHeading: store.settings.formHeading || "",
        isActive: store.settings.isActive !== false,
      });
    }
  }, [store.settings]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleEdit = () => {
    if (!isDisabled) {
      if (store.settings) {
        setFormData({
          pageTitle: store.settings.pageTitle || "",
          introLine: store.settings.introLine || "",
          description: store.settings.description || "",
          formHeading: store.settings.formHeading || "",
          isActive: store.settings.isActive !== false,
        });
      }
    }
    setDisabled((prev) => !prev);
  };

  const onCancel = () => {
    if (store.settings) {
      setFormData({
        pageTitle: store.settings.pageTitle || "",
        introLine: store.settings.introLine || "",
        description: store.settings.description || "",
        formHeading: store.settings.formHeading || "",
        isActive: store.settings.isActive !== false,
      });
    }
    setDisabled(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await updateBespokeSettings(formData);
    if (result?.status) {
      setDisabled(true);
    }
  };

  if (store.loadingSettings && !store.settings) {
    return (
      <Container>
        <BouncingLoader />
      </Container>
    );
  }

  return (
    <Container className="common-settings">
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          {
            label: "Bespoke Appointment Settings",
            link: "/admin/bespoke-appointment-settings",
          },
          { label: "Page content" },
        ]}
      />

      <Form onSubmit={onSubmit} autoComplete="off">
        <div className="common-settings__header">
          <div>
            <h2 className="common-settings__title">Page content</h2>
            <p className="common-settings__subtitle">
              Title, intro, description, and form heading for the storefront appointment page.
            </p>
          </div>
          <Button
            variant={null}
            type="button"
            className="btn btn--outline common-settings__edit-btn"
            onClick={toggleEdit}
          >
            {isDisabled ? <MdEdit size={18} /> : <FaRegEye size={18} />}
            <span>{isDisabled ? "Edit" : "Preview"}</span>
          </Button>
        </div>

        <Card className="common-panel-card mb-4">
          <Card.Header>Appointment page</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Page title</Form.Label>
                  <Form.Control
                    name="pageTitle"
                    value={formData.pageTitle}
                    onChange={onChange}
                    disabled={isDisabled}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Intro line</Form.Label>
                  <Form.Control
                    name="introLine"
                    value={formData.introLine}
                    onChange={onChange}
                    disabled={isDisabled}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="description"
                    value={formData.description}
                    onChange={onChange}
                    disabled={isDisabled}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Form heading</Form.Label>
                  <Form.Control
                    name="formHeading"
                    value={formData.formHeading}
                    onChange={onChange}
                    disabled={isDisabled}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id="bespoke-page-active"
                  name="isActive"
                  label="Page visible on storefront"
                  checked={formData.isActive}
                  onChange={onChange}
                  disabled={isDisabled}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="d-flex flex-wrap justify-content-between gap-2 pb-3">
          <Button
            type="button"
            className="btn btn--outline"
            onClick={() => navigate("/admin/bespoke-appointment-settings")}
          >
            Back to settings
          </Button>
          {!isDisabled && (
            <div className="d-flex gap-2">
              <Button
                type="button"
                className="btn btn--outline"
                onClick={onCancel}
                disabled={store.loadingSettings}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn btn--theme"
                disabled={store.loadingSettings}
              >
                {store.loadingSettings ? "Saving..." : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </Form>
    </Container>
  );
};

BespokeAppointmentPageContent.propTypes = {
  store: PropTypes.object.isRequired,
  getBespokeSettings: PropTypes.func.isRequired,
  updateBespokeSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  store: state.bespokeAppointment,
});

export default connect(mapStateToProps, {
  getBespokeSettings,
  updateBespokeSettings,
})(BespokeAppointmentPageContent);
