import { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Container } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CommonSpinner from "@src/components/common/Loaders/CommonSpinner";
import { setErrors } from "@src/features/auth/authActions";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  cleanupShowcaseUploadedImages,
  getShowcaseById,
  updateShowcase,
  uploadShowcaseImages,
} from "../showcaseActions";
import ShowcaseForm from "../components/ShowcaseForm";
import ShowcaseGalleryField from "../components/ShowcaseGalleryField";

const ShowcaseEdit = ({
  getShowcaseById,
  updateShowcase,
  cleanupShowcaseUploadedImages,
  uploadShowcaseImages,
  setErrors,
  removeErrors,
  loadingSubmit,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const uploadItemsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    heading: "",
    description: "",
    isActive: "true",
  });
  const [uploadItems, setUploadItems] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    uploadItemsRef.current = uploadItems || [];
  }, [uploadItems]);

  useEffect(() => {
    removeErrors();
  }, [removeErrors]);

  useEffect(
    () => () => {
      (uploadItemsRef.current || []).forEach((item) => {
        if (item?.previewUrl?.startsWith("blob:"))
          URL.revokeObjectURL(item.previewUrl);
      });
    },
    [],
  );

  useEffect(() => {
    const run = async () => {
      const result = await getShowcaseById(id);
      if (!result?.status) return navigate("/admin/showcase-section-management");
      const row = result.data;
      setFormData({
        heading: row.heading || "",
        description: row.description || "",
        isActive: row.isActive !== false ? "true" : "false",
      });
      setUploadItems(
        (Array.isArray(row.images) ? row.images : []).map((image, index) => ({
          id: `existing-${index}-${String(image?.publicId || image?.url || "")}`,
          file: null,
          name: image?.publicId?.split("/").pop() || `image-${index + 1}`,
          previewUrl: image?.url || "",
          url: image?.url || "",
          publicId: image?.publicId || "",
          progress: 100,
          status: "success",
        })),
      );
      setSubmitAttempted(false);
      setLoading(false);
    };
    run();
  }, [getShowcaseById, id, navigate]);

  const uploadingImages = useMemo(
    () => (uploadItems || []).some((item) => item.status === "uploading"),
    [uploadItems],
  );

  const validateForm = () => {
    const errors = {};
    if (!String(formData.heading || "").trim()) {
      errors.heading = "Heading is required.";
    }
    if (!String(formData.description || "").trim()) {
      errors.description = "Description is required.";
    }
    return errors;
  };

  const localErrors = useMemo(
    () => (submitAttempted ? validateForm() : {}),
    [submitAttempted, formData],
  );

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onUploadImages = (files) => {
    if (!files?.length) return;
    const newItems = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file?.name || "image",
      previewUrl: URL.createObjectURL(file),
      url: "",
      publicId: "",
      progress: 100,
      status: "success",
    }));
    setUploadItems((prev) => [...prev, ...newItems]);
  };

  const onRemoveImageUpload = (itemId) => {
    const target = (uploadItems || []).find((item) => item.id === itemId);
    if (!target) return;
    if (target?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setUploadItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const onRetryImageUpload = async (itemId) => {
    const target = (uploadItems || []).find((item) => item.id === itemId);
    if (!target?.file) return;
    setUploadItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, status: "uploading", progress: 1 } : row,
      ),
    );
    const res = await uploadShowcaseImages([target.file], {
      onUploadProgress: (ev) => {
        const total = ev?.total || 0;
        const loaded = ev?.loaded || 0;
        const percent = total > 0 ? Math.round((loaded * 100) / total) : 0;
        setUploadItems((prev) =>
          prev.map((row) =>
            row.id === itemId ? { ...row, progress: Math.max(1, percent) } : row,
          ),
        );
      },
    });
    if (!res?.status || !Array.isArray(res.data) || !res.data[0]) {
      setUploadItems((prev) =>
        prev.map((row) =>
          row.id === itemId ? { ...row, status: "error", progress: 0 } : row,
        ),
      );
      return;
    }
    const uploaded = res.data[0];
    setUploadItems((prev) =>
      prev.map((row) =>
        row.id === itemId
          ? {
              ...row,
              status: "success",
              progress: 100,
              url: uploaded.url,
              publicId: uploaded.publicId,
            }
          : row,
      ),
    );
  };

  const cleanupUploadedPublicIds = async (publicIds = []) => {
    await cleanupShowcaseUploadedImages(publicIds);
  };

  const uploadNewImagesForSubmit = async () => {
    const snapshots = uploadItemsRef.current || [];
    const itemsToUpload = snapshots.filter((item) => item?.file && !item?.publicId);
    if (itemsToUpload.length === 0) {
      return { status: true, uploadedPublicIds: [], uploadedMap: new Map() };
    }
    const uploadedPublicIds = [];
    const uploadedMap = new Map();

    setUploadItems((prev) =>
      prev.map((row) =>
        itemsToUpload.some((item) => item.id === row.id)
          ? { ...row, status: "uploading", progress: 1 }
          : row,
      ),
    );

    const res = await uploadShowcaseImages(
      itemsToUpload.map((item) => item.file),
      {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent?.total || 0;
          const loaded = progressEvent?.loaded || 0;
          const percent = total > 0 ? Math.round((loaded * 100) / total) : 0;
          setUploadItems((prev) =>
            prev.map((row) =>
              itemsToUpload.some((item) => item.id === row.id)
                ? { ...row, progress: Math.max(1, percent) }
                : row,
            ),
          );
        },
      },
    );

    if (
      !res?.status ||
      !Array.isArray(res.data) ||
      res.data.length !== itemsToUpload.length
    ) {
      setUploadItems((prev) =>
        prev.map((row) =>
          itemsToUpload.some((item) => item.id === row.id)
            ? { ...row, status: "error", progress: 0 }
            : row,
        ),
      );
      await cleanupUploadedPublicIds(uploadedPublicIds);
      return { status: false };
    }

    itemsToUpload.forEach((item, index) => {
      const uploaded = res.data[index] || {};
      if (uploaded?.publicId) uploadedPublicIds.push(uploaded.publicId);
      uploadedMap.set(item.id, {
        url: uploaded?.url || "",
        publicId: uploaded?.publicId || "",
      });
    });

    const hasInvalid = Array.from(uploadedMap.values()).some(
      (item) => !item.url || !item.publicId,
    );
    if (hasInvalid) {
      setUploadItems((prev) =>
        prev.map((row) =>
          itemsToUpload.some((item) => item.id === row.id)
            ? { ...row, status: "error", progress: 0 }
            : row,
        ),
      );
      await cleanupUploadedPublicIds(uploadedPublicIds);
      return { status: false };
    }

    setUploadItems((prev) =>
      prev.map((row) => {
        const uploaded = uploadedMap.get(row.id);
        if (!uploaded) return row;
        return {
          ...row,
          status: "success",
          progress: 100,
          url: uploaded.url,
          publicId: uploaded.publicId,
        };
      }),
    );

    return { status: true, uploadedPublicIds, uploadedMap };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(
        Object.entries(validationErrors).map(([path, msg]) => ({
          path,
          msg,
        })),
      );
      return;
    }

    if ((uploadItemsRef.current || []).length === 0) {
      setErrors([
        {
          path: "images",
          msg: "Please keep at least one gallery image.",
        },
      ]);
      return;
    }

    const uploadResult = await uploadNewImagesForSubmit();
    if (!uploadResult?.status) {
      setErrors([
        {
          path: "images",
          msg: "Some images failed to upload. Please retry and submit again.",
        },
      ]);
      return;
    }

    const finalImages = (uploadItemsRef.current || [])
      .map((item) => {
        if (item?.url && item?.publicId) {
          return { url: item.url, publicId: item.publicId };
        }
        const uploaded = uploadResult.uploadedMap.get(item.id);
        if (uploaded?.url && uploaded?.publicId) return uploaded;
        return null;
      })
      .filter(Boolean);

    if (!finalImages.length) {
      setErrors([
        {
          path: "images",
          msg: "Please keep at least one gallery image.",
        },
      ]);
      return;
    }

    const payload = {
      heading: String(formData.heading || "").trim(),
      description: String(formData.description || "").trim(),
      isActive: formData.isActive === "true" || formData.isActive === true,
      images: finalImages,
    };

    const result = await updateShowcase(id, payload);
    if (result?.status) {
      removeErrors();
      navigate("/admin/showcase-section-management");
      return;
    }
    await cleanupUploadedPublicIds(uploadResult.uploadedPublicIds || []);
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
            label: "Showcase Section Management",
            link: "/admin/showcase-section-management",
          },
          { label: "Edit Showcase" },
        ]}
      />
      <Card className="common-panel-card">
        <Card.Header>Edit Showcase Section</Card.Header>
        <Card.Body>
          <form onSubmit={onSubmit}>
            <ShowcaseForm
              formData={formData}
              onInputChange={onInputChange}
              localErrors={localErrors}
            />
            <ShowcaseGalleryField
              uploadItems={uploadItems}
              onUploadImages={onUploadImages}
              onRetryImageUpload={onRetryImageUpload}
              onRemoveImageUpload={onRemoveImageUpload}
              uploadingImages={uploadingImages}
              imagesError={localErrors.images}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                className="btn btn--outline"
                type="button"
                onClick={() => navigate("/admin/showcase-section-management")}
                disabled={loadingSubmit}
              >
                Cancel
              </Button>
              <Button
                className="btn btn--theme"
                type="submit"
                disabled={loadingSubmit || uploadingImages}
              >
                {loadingSubmit ? "Saving..." : "Update Showcase"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  loadingSubmit: state.showcase.loadingSubmit,
});

export default connect(mapStateToProps, {
  getShowcaseById,
  updateShowcase,
  cleanupShowcaseUploadedImages,
  uploadShowcaseImages,
  setErrors,
  removeErrors,
})(ShowcaseEdit);
