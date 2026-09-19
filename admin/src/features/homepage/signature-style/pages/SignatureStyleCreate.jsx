import { useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { createSignatureStyle } from "../signatureStyleActions";
import SignatureStyleForm from "../components/SignatureStyleForm";

const initial = {
  title: "",
  subtitle: "",
  productId: "",
  productLabel: "",
  collectionPath: "",
  isActive: "true",
  image: null,
};

const SignatureStyleCreate = ({ createSignatureStyle, loadingSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initial);

  const onInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: type === "file" ? files?.[0] || null : value,
    }));
  };

  const onProductChange = (option) => {
    setFormData((p) => ({
      ...p,
      productId: option?.value ?? "",
      productLabel: option?.label ?? "",
      collectionPath: option?.slug ? `/collection/${option.slug}` : "",
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("subtitle", formData.subtitle ?? "");
    data.append("isActive", formData.isActive);
    data.append("productId", formData.productId);
    if (formData.image instanceof File) data.append("image", formData.image);
    const r = await createSignatureStyle(data);
    if (r?.status) navigate("/admin/signature-styles-management");
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          {
            label: "Signature Styles Management",
            link: "/admin/signature-styles-management",
          },
          { label: "Create Style" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Create Signature Style</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <SignatureStyleForm
              formData={formData}
              onInputChange={onInputChange}
              onProductChange={onProductChange}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                className="btn btn--outline"
                type="button"
                onClick={() => navigate("/admin/signature-styles-management")}
              >
                Cancel
              </Button>
              <Button
                className="btn btn--theme"
                type="submit"
                disabled={loadingSubmit}
              >
                {loadingSubmit ? "Saving..." : "Create Style"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loadingSubmit: state.signatureStyle.loadingSubmit,
});
export default connect(mapStateToProps, { createSignatureStyle })(
  SignatureStyleCreate,
);
