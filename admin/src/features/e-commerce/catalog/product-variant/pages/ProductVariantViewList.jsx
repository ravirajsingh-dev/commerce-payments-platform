import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  Button,
  Card,
  Col,
  Collapse,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import ProductVariantTable from "@src/features/e-commerce/catalog/product-variant/components/ProductVariantTable";
import {
  deleteProductVariant,
  getProductVariantList,
} from "@src/features/e-commerce/catalog/product-variant/productVariantActions";
import { getProductById } from "@src/features/e-commerce/catalog/product/productActions";

const ProductVariantViewList = ({
  productVariantStore,
  getProductVariantList,
  deleteProductVariant,
  getProductById,
}) => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [productName, setProductName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [params, setParams] = useState(() => {
    const initial = getInitialSortingParams({
      orderBy: "createdAt",
      ascending: "desc",
    });
    if (!productId) return initial;
    return {
      ...initial,
      filters: "productId",
      query: JSON.stringify({ productId: { value: productId, type: "id" } }),
    };
  });

  const { productVariants, totalRecord, loadingList, loadingSubmit } =
    productVariantStore;

  const buildParams = (status, prevParams = params) => {
    const nextQuery = {
      productId: { value: productId, type: "id" },
    };
    const nextFilters = ["productId"];
    if (status !== "" && status !== null) {
      nextFilters.push("status");
      nextQuery.status = { value: Number(status), type: "Number" };
    }
    return {
      ...prevParams,
      page: 1,
      filters: nextFilters.join(","),
      query: JSON.stringify(nextQuery),
    };
  };

  useEffect(() => {
    if (!productId) return;
    setStatusFilter("");
    setAppliedStatus("");
  }, [productId]);

  useEffect(() => {
    if (!productId || !params?.filters?.includes("productId")) return;
    getProductVariantList(params);
  }, [getProductVariantList, params, productId]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      const res = await getProductById(productId);
      if (res?.status && res?.data) {
        setProductName(res.data.name || "");
      }
    };
    loadProduct();
  }, [getProductById, productId]);

  const onApplyFilter = () => {
    setAppliedStatus(statusFilter);
    setParams((prev) => buildParams(statusFilter, prev));
  };

  const onResetFilter = () => {
    setStatusFilter("");
    setAppliedStatus("");
    setParams((prev) => buildParams("", prev));
  };

  const setParamsForTable = (next) => {
    setParams((prev) => {
      const updated = typeof next === "function" ? next(prev) : next;
      const nextQuery = {
        productId: { value: productId, type: "id" },
      };
      const nextFilters = ["productId"];
      if (appliedStatus !== "" && appliedStatus !== null) {
        nextFilters.push("status");
        nextQuery.status = { value: Number(appliedStatus), type: "Number" };
      }
      return {
        ...updated,
        filters: nextFilters.join(","),
        query: JSON.stringify(nextQuery),
      };
    });
  };

  const handleOpenEdit = (variant) => {
    if (!variant?._id) return;
    navigate(`/admin/product-variants/edit/${variant._id}`);
  };

  const handleOpenDelete = (variant) => {
    setSelectedVariant(variant);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedVariant(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedVariant?._id) return;
    const result = await deleteProductVariant(selectedVariant._id);
    if (result?.status) {
      handleCloseDelete();
      await getProductVariantList(params);
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Product Variants", link: "/admin/product-variants" },
          { label: productName || "View List" },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          type="button"
          className="btn btn--outline"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button
          type="button"
          className="btn btn--theme"
          onClick={() =>
            navigate(`/admin/product-variants/add?productId=${productId}`)
          }
        >
          + Add Variant
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <Card className="common-panel-card mb-3">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="1">Active</option>
                      <option value="2">Draft</option>
                      <option value="3">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={8} className="d-flex justify-content-end gap-2">
                  <Button
                    type="button"
                    className="btn btn--outline"
                    onClick={onResetFilter}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="btn btn--theme"
                    onClick={onApplyFilter}
                  >
                    Search
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>
      </Collapse>

      <ProductVariantTable
        data={productVariants}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParamsForTable}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDelete}
        title="Delete Variant"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: handleCloseDelete,
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: onConfirmDelete,
            className: "btn btn--danger",
            disabled: loadingSubmit,
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Are you sure you want to delete variant{" "}
          <strong>{selectedVariant?.sku || "this SKU"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  productVariantStore: state.productVariant,
});

export default connect(mapStateToProps, {
  getProductVariantList,
  deleteProductVariant,
  getProductById,
})(ProductVariantViewList);
