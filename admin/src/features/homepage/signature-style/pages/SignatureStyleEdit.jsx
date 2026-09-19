import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import {
  getSignatureStyleById,
  updateSignatureStyle,
} from "../signatureStyleActions";
import SignatureStyleForm from "../components/SignatureStyleForm";

const SignatureStyleEdit = ({
  getSignatureStyleById,
  updateSignatureStyle,
  loadingSubmit,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    productId: "",
    productLabel: "",
    collectionPath: "",
    isActive: "true",
    image: null,
  });

  useEffect(() => {
    const run = async () => {
      const r = await getSignatureStyleById(id);
      if (!r?.status) return navigate("/admin/signature-styles-management");
      const p = r.data.productId;
      const productIdStr =
        p && typeof p === "object" && p._id
          ? String(p._id)
          : p
            ? String(p)
            : "";
      const productLabel =
        p && typeof p === "object" && p.name
          ? `${p.name} (${p.slug || ""})`
          : "";
      setFormData({
        title: r.data.title || "",
        subtitle: r.data.subtitle || "",
        productId: productIdStr,
        productLabel,
        collectionPath: r.data.routePath || "",
        isActive: r.data.isActive !== false ? "true" : "false",
        image: null,
      });
      setExistingImageUrl(r.data.image || "");
      setLoading(false);
    };
    run();
  }, [getSignatureStyleById, id, navigate]);

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
    const r = await updateSignatureStyle(id, data);
    if (r?.status) navigate("/admin/signature-styles-management");
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
            label: "Signature Styles Management",
            link: "/admin/signature-styles-management",
          },
          { label: "Edit Style" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Edit Signature Style</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <SignatureStyleForm
              formData={formData}
              onInputChange={onInputChange}
              onProductChange={onProductChange}
              isEditMode
              existingImageUrl={existingImageUrl}
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
                {loadingSubmit ? "Saving..." : "Update Style"}
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
export default connect(mapStateToProps, {
  getSignatureStyleById,
  updateSignatureStyle,
})(SignatureStyleEdit);
