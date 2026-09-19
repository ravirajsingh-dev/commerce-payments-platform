import { Card, Col, Row } from "react-bootstrap";

const SummaryStatsCards = ({ items = [], className = "mb-3", col = {} }) => {
  const colProps = { xs: 6, md: 3, sm: 6, ...col };

  return (
    <Row className={`g-3 ${className}`.trim()}>
      {items.map((item, idx) => (
        <Col key={`${item.label}-${idx}`} {...colProps}>
          {typeof item.onClick === "function" ? (
            <button
              type="button"
              className={`summary-stats-cards__button ${item.active ? "is-active" : ""}`.trim()}
              onClick={item.onClick}
            >
              <Card className="common-panel-card summary-stats-cards__card">
                <Card.Body>
                  <h6>{item.label}</h6>
                  <h4>{item.value ?? 0}</h4>
                </Card.Body>
              </Card>
            </button>
          ) : (
            <Card className="common-panel-card">
              <Card.Body>
                <h6>{item.label}</h6>
                <h4>{item.value ?? 0}</h4>
              </Card.Body>
            </Card>
          )}
        </Col>
      ))}
    </Row>
  );
};

export default SummaryStatsCards;
