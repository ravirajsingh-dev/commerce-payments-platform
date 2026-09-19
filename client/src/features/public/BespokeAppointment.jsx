import { useCallback, useEffect, useMemo, useState } from "react";
import { Container, Form, Button, Row, Col } from "react-bootstrap";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CustomSelect from "@src/components/common/CustomSelect";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import Errors from "@src/notifications/Errors";
import { handleNumberInput } from "@src/utils/helper";
import {
  getBespokeAppointmentContent,
  submitBespokeAppointment,
} from "@src/features/bespoke-appointment/bespokeAppointmentActions";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  serviceOptionId: "",
  message: "",
  appointmentDate: "",
  appointmentTime: "",
};

const BespokeAppointment = ({
  bespokeAppointment: { content, loadingContent, submitting, submitSuccess },
  getBespokeAppointmentContent,
  submitBespokeAppointment,
}) => {
  const [formData, setFormData] = useState(initialForm);
  const [validated, setValidated] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    getBespokeAppointmentContent();
  }, [getBespokeAppointmentContent]);

  const settings = content?.settings;
  const options = content?.options || [];

  const pageTitle =
    settings?.pageTitle || "BOOK AN APPOINTMENT - BESPOKE SERVICES";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: pageTitle },
    ],
    [pageTitle],
  );

  const serviceSelectOptions = useMemo(
    () =>
      options.map((o) => ({
        value: o._id,
        label: o.label,
      })),
    [options],
  );

  const loadServiceOptions = useCallback(
    async () => serviceSelectOptions,
    [serviceSelectOptions],
  );

  useEffect(() => {
    if (submitSuccess) {
      setFormData(initialForm);
      setSelectedService(null);
      setValidated(false);
    }
  }, [submitSuccess]);

  const onChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === "phone") {
      next = String(value).replace(/\D/g, "").slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: next }));
  };

  const onServiceChange = (option) => {
    setSelectedService(option);
    setFormData((prev) => ({
      ...prev,
      serviceOptionId: option?.value || "",
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      return;
    }
    if (!formData.serviceOptionId) return;

    await submitBespokeAppointment({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      serviceOptionId: formData.serviceOptionId,
      message: formData.message.trim(),
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,
    });
  };

  if (loadingContent) {
    return (
      <div className="bespoke-appointment-page">
        <Container>
          <BouncingLoader minHeight="500px" />
        </Container>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bespoke-appointment-page">
        <Container>
          <NoRecordsFound
            compact={false}
            description="Appointment booking is currently unavailable. Please check back soon."
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="bespoke-appointment-page">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />

      <section className="bespoke-appointment-section">
        <Container>
          <div className="bespoke-appointment-intro text-center">
            {settings.introLine && (
              <p className="bespoke-appointment-intro-line">{settings.introLine}</p>
            )}
            {settings.description && (
              <div
                className="bespoke-appointment-description"
                dangerouslySetInnerHTML={{
                  __html: settings.description.replace(/\n/g, "<br />"),
                }}
              />
            )}
          </div>

          <div className="bespoke-appointment-form-wrap">
            {settings.formHeading && (
              <h2 className="bespoke-appointment-form-heading text-center">
                {settings.formHeading}
              </h2>
            )}

            <Form
              noValidate
              validated={validated}
              onSubmit={onSubmit}
              className="bespoke-appointment-form common-form-card"
            >
              <Errors />

              <Row className="g-3">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Name *</Form.Label>
                    <Form.Control
                      name="name"
                      value={formData.name}
                      onChange={onChange}
                      required
                      maxLength={150}
                      placeholder="Your name"
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      required
                      maxLength={200}
                      placeholder="you@example.com"
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Phone Number *</Form.Label>
                    <Form.Control
                      name="phone"
                      value={formData.phone}
                      onChange={onChange}
                      onInput={handleNumberInput}
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Service *</Form.Label>
                    <CustomSelect
                      value={selectedService}
                      onChange={onServiceChange}
                      loadOptions={loadServiceOptions}
                      placeholder="Select a service"
                      isRequired
                      error={
                        validated && !formData.serviceOptionId
                          ? "Please select a service"
                          : null
                      }
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Preferred Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="appointmentDate"
                      value={formData.appointmentDate}
                      onChange={onChange}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Preferred Time *</Form.Label>
                    <Form.Control
                      type="time"
                      name="appointmentTime"
                      value={formData.appointmentTime}
                      onChange={onChange}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="message"
                      value={formData.message}
                      onChange={onChange}
                      maxLength={2000}
                      placeholder="Tell us about your requirements"
                    />
                  </Form.Group>
                </Col>

                <Col md={12} className="text-center">
                  <Button
                    type="submit"
                    className="btn btn--theme bespoke-appointment-submit"
                    disabled={submitting || !options.length}
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                  {!options.length && (
                    <p className="text-muted mt-2 mb-0">
                      No services are available for booking at the moment.
                    </p>
                  )}
                </Col>
              </Row>
            </Form>
          </div>

          <p className="bespoke-appointment-back text-center mt-4">
            <Link to="/">← Back to Home</Link>
          </p>
        </Container>
      </section>
    </div>
  );
};

BespokeAppointment.propTypes = {
  bespokeAppointment: PropTypes.object.isRequired,
  getBespokeAppointmentContent: PropTypes.func.isRequired,
  submitBespokeAppointment: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  bespokeAppointment: state.bespokeAppointment,
});

export default connect(mapStateToProps, {
  getBespokeAppointmentContent,
  submitBespokeAppointment,
})(BespokeAppointment);
