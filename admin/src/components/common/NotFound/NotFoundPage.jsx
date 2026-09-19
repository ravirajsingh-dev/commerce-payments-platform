import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";

const NotFoundPage = ({ common: { commonSettings } = {} }) => {
  const navigate = useNavigate();
  const apiLabel = commonSettings?.abbreviation || commonSettings?.name || "";
  const displayName = apiLabel || import.meta.env.VITE_APP_ADMIN_NAME || "";
  const titleText = displayName
    ? `A Small Pause in ${displayName}`
    : "Page Not Found";
  const buttonText = displayName
    ? `Go Back to ${displayName} Home`
    : "Go Back to Home";

  return (
    <Container fluid className="not-found-page">
      <Row className="justify-content-center align-items-center h-100">
        <Col xs={12} md={8} lg={6} className="py-5 text-center">
          <h1 className="error-title mb-3">{titleText}</h1>
          <p className="error-message mb-4">
            The page you're looking for isn't available right now.
            <br />
            We'll get you back on track.
          </p>
          <Button
            variant={null}
            className="btn btn--theme"
            onClick={() => navigate("/")}
          >
            {buttonText}
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  common: state.common,
});

export default connect(mapStateToProps)(NotFoundPage);
