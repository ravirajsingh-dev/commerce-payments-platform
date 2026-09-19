import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import HomeSliderForm from "../components/HomeSliderForm";
import { getHomeSliderById, updateHomeSlider } from "../homeSliderActions";

const HomeSliderEdit = ({
  getHomeSliderById,
  updateHomeSlider,
  loadingSubmit,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [formData, setFormData] = useState({
    heading: "",
    shortDesc: "",
    buttonText: "",
    buttonLink: "",
    status: "true",
    image: null,
  });

  useEffect(() => {
    const run = async () => {
      const result = await getHomeSliderById(id);
      if (!result?.status) return navigate("/admin/home-slider-management");
      setFormData((p) => ({
        ...p,
        heading: result.data.heading || "",
        shortDesc: result.data.shortDesc || "",
        buttonText: result.data.buttonText || "",
        buttonLink: result.data.buttonLink || "",
        status: result.data.status !== false ? "true" : "false",
      }));
      setExistingImageUrl(result.data.image || "");
      setLoading(false);
    };
    run();
  }, [getHomeSliderById, id, navigate]);

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
    data.append("heading", formData.heading);
    data.append("shortDesc", formData.shortDesc ?? "");
    data.append("buttonText", formData.buttonText ?? "");
    data.append("buttonLink", formData.buttonLink ?? "");
    data.append("status", formData.status);
    if (formData.image instanceof File) data.append("image", formData.image);
    const result = await updateHomeSlider(id, data);
    if (result?.status) navigate("/admin/home-slider-management");
  };

  if (loading) {
    return (
      <div className="portal-content-loader" style={{ minHeight: "360px" }}>
        <CommonSpinner size="lg" />
      </div>
    );
  }

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          {
            label: "Home Slider Management",
            link: "/admin/home-slider-management",
          },
          { label: "Edit Slide" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Edit Home Slide</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <HomeSliderForm
              formData={formData}
              onInputChange={onInputChange}
              isEditMode
              existingImageUrl={existingImageUrl}
            />
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
                {loadingSubmit ? "Saving..." : "Update Slide"}
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
export default connect(mapStateToProps, {
  getHomeSliderById,
  updateHomeSlider,
})(HomeSliderEdit);
