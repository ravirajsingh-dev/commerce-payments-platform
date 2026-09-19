import { useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { createClientele } from "../clienteleActions";
import ClienteleForm from "../components/ClienteleForm";

const NOTE_MAX_LENGTH = 300;

const initial = {
  name: "",
  note: "",
  isActive: "true",
  image: null,
};

const ClienteleCreate = ({ createClientele, loadingSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initial);

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
    const r = await createClientele(data);
    if (r?.status) navigate("/admin/clientele-management");
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          {
            label: "Clientele Management",
            link: "/admin/clientele-management",
          },
          { label: "Create Clientele" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Create Clientele</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ClienteleForm formData={formData} onInputChange={onInputChange} />
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
                {loadingSubmit ? "Saving..." : "Create Clientele"}
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
export default connect(mapStateToProps, { createClientele })(ClienteleCreate);
