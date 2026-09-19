import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { connect } from "react-redux";

const NotFoundPage = ({
  common: { commonSettings, loadingCommonSettings } = {},
}) => {
  const navigate = useNavigate();
  const abbreviation = commonSettings?.abbreviation;

  const titleText = loadingCommonSettings
    ? "Loading..."
    : abbreviation
      ? `A Small Pause in ${abbreviation}`
      : "Page Not Found";
  const buttonText = abbreviation
    ? `Go Back to ${abbreviation} Home`
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
