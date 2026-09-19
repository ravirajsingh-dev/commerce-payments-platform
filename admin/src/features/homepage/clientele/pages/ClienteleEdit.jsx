import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import { getClienteleById, updateClientele } from "../clienteleActions";
import ClienteleForm from "../components/ClienteleForm";

const NOTE_MAX_LENGTH = 300;

const ClienteleEdit = ({ getClienteleById, updateClientele, loadingSubmit }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    note: "",
    isActive: "true",
    image: null,
  });

  useEffect(() => {
    const run = async () => {
      const r = await getClienteleById(id);
      if (!r?.status) return navigate("/admin/clientele-management");
      setFormData({
        name: r.data.name || "",
        note: String(r.data.note || "").slice(0, NOTE_MAX_LENGTH),
        isActive: r.data.isActive !== false ? "true" : "false",
        image: null,
      });
      setExistingImageUrl(r.data.image || "");
      setLoading(false);
    };
    run();
  }, [getClienteleById, id, navigate]);

  const onInputChange = (e) => {
    const { name, value, type, files } = e.target;
    const nextValue =
      name === "note" && type !== "file"
        ? String(value || "").slice(0, NOTE_MAX_LENGTH)
        : value;

    setFormData((p) => ({
      ...p,
      [name]: type === "file" ? files?.[0] || null : nextValue,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const safeNote = String(formData.note || "").slice(0, NOTE_MAX_LENGTH);
    const data = new FormData();
    data.append("name", formData.name);
    data.append("note", safeNote);
    data.append("isActive", formData.isActive);
    if (formData.image instanceof File) data.append("image", formData.image);
    const r = await updateClientele(id, data);
    if (r?.status) navigate("/admin/clientele-management");
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
            label: "Clientele Management",
            link: "/admin/clientele-management",
          },
          { label: "Edit Clientele" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Edit Clientele</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ClienteleForm
              formData={formData}
              onInputChange={onInputChange}
              isEditMode
              existingImageUrl={existingImageUrl}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                className="btn btn--outline"
                type="button"
                onClick={() => navigate("/admin/clientele-management")}
              >
                Cancel
              </Button>
              <Button
                className="btn btn--theme"
                type="submit"
                disabled={loadingSubmit}
              >
                {loadingSubmit ? "Saving..." : "Update Clientele"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loadingSubmit: state.clientele.loadingSubmit,
});
export default connect(mapStateToProps, { getClienteleById, updateClientele })(
  ClienteleEdit,
);
