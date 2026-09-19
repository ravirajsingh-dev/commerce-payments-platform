import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "react-bootstrap";

const TITLE_BY_PATH = {
  "/stores": "Stores",
  "/wardrobe-solution": "Wardrobe Solution",
};

const StaticInfoPage = () => {
  const { pathname } = useLocation();
  const title = useMemo(() => TITLE_BY_PATH[pathname] ?? "Information", [pathname]);

  return (
    <div className="static-info-page">
      <Container className="static-info-page-inner py-5 my-md-3">
        <h1 className="static-info-page-title">{title}</h1>
        <p className="static-info-page-lead mb-0">
          For assistance, please visit our{" "}
          <Link to="/contact-us" className="static-info-page-link">
            contact page
          </Link>
          .
        </p>
      </Container>
    </div>
  );
};

export default StaticInfoPage;
