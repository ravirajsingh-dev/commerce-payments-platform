import { Card, Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";

const quickLinks = [
  { label: "Users", path: "/admin/users" },
  { label: "Catalog", path: "/admin/catalog" },
  { label: "Low stock", path: "/admin/inventory" },
  { label: "Stock adjustments", path: "/admin/inventory/stock-adjustments" },
  { label: "Orders", path: "/admin/orders" },
  { label: "Sales analytics", path: "/admin/analytics/sales" },
  { label: "Payments", path: "/admin/payments" },
  { label: "Coupons", path: "/admin/coupons" },
  { label: "CMS", path: "/admin/cms" },
  { label: "Reviews", path: "/admin/reviews" },
];

const Dashboard = () => {
  return (
    <Container>
      <AppBreadCrumb breadcrumbs={[{ label: "Dashboard" }]} />
      {/* <Row className="g-3">
        {quickLinks.map((item) => (
          <Col key={item.path} md={6} lg={3}>
            <Card className="common-panel-card h-100">
              <Card.Body className="d-flex flex-column justify-content-between">
                <Card.Title as="h6">{item.label}</Card.Title>
                <div>
                  <Link to={item.path} className="btn btn--outline btn-sm">
                    Open {item.label}
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row> */}
    </Container>
  );
};

export default Dashboard;
