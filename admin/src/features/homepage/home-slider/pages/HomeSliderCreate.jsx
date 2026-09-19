import { useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import HomeSliderForm from "../components/HomeSliderForm";
import { createHomeSlider } from "../homeSliderActions";

const initial = {
  heading: "",
  shortDesc: "",
  buttonText: "",
  buttonLink: "",
  status: "true",
  image: null,
};

const HomeSliderCreate = ({ createHomeSlider, loadingSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initial);
  const onInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "file" ? files?.[0] || null : value,
    }));
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v !== null && v !== undefined) data.append(k, v);
    });
    const result = await createHomeSlider(data);
    if (result?.status) navigate("/admin/home-slider-management");
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          {
            label: "Home Slider Management",
            link: "/admin/home-slider-management",
          },
          { label: "Create Slide" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Create Home Slide</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <HomeSliderForm formData={formData} onInputChange={onInputChange} />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                className="btn btn--outline"
                type="button"
                onClick={() => navigate("/admin/home-slider-management")}
              >
                Cancel
              </Button>
              <Button
                className="btn btn--theme"
                type="submit"
                disabled={loadingSubmit}
              >
                {loadingSubmit ? "Saving..." : "Create Slide"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loadingSubmit: state.homeSlider.loadingSubmit,
});
export default connect(mapStateToProps, { createHomeSlider })(HomeSliderCreate);
