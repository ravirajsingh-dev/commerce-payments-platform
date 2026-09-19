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
import AttributeTable from "@src/features/e-commerce/catalog/attribute/components/AttributeTable";
import {
  deleteAttribute,
  getAttributeList,
} from "@src/features/e-commerce/catalog/attribute/attributeActions";
import { getAttributeSetById } from "@src/features/e-commerce/catalog/attribute-set/attributeSetActions";

const AttributeViewList = ({
  attributeStore,
  getAttributeList,
  deleteAttribute,
  getAttributeSetById,
}) => {
  const navigate = useNavigate();
  const { attributeSetId } = useParams();
  const [attributeSetName, setAttributeSetName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [params, setParams] = useState(() => {
    const initial = getInitialSortingParams({
      orderBy: "createdAt",
      ascending: "desc",
    });
    if (!attributeSetId) return initial;
    return {
      ...initial,
      filters: "attributeSetId",
      query: JSON.stringify({ attributeSetId: { value: attributeSetId, type: "id" } }),
    };
  });

  const { attributes, totalRecord, loadingList, loadingSubmit } = attributeStore;

  const buildParams = (status, prevParams = params) => {
    const nextQuery = {
      attributeSetId: { value: attributeSetId, type: "id" },
    };
    const nextFilters = ["attributeSetId"];
    if (status !== "" && status !== null) {
      nextFilters.push("isActive");
      nextQuery.isActive = {
        value: status === true || status === "true",
        type: "Boolean",
      };
    }
    return {
      ...prevParams,
      page: 1,
      filters: nextFilters.join(","),
      query: JSON.stringify(nextQuery),
    };
  };

  useEffect(() => {
    if (!attributeSetId) return;
    setStatusFilter("");
    setAppliedStatus("");
  }, [attributeSetId]);

  useEffect(() => {
    if (!attributeSetId || !params?.filters?.includes("attributeSetId")) return;
    getAttributeList(params);
  }, [attributeSetId, getAttributeList, params]);

  useEffect(() => {
    const loadAttributeSet = async () => {
      if (!attributeSetId) return;
      const res = await getAttributeSetById(attributeSetId);
      if (res?.status && res?.data) {
        setAttributeSetName(res.data.name || "");
      }
    };
    loadAttributeSet();
  }, [attributeSetId, getAttributeSetById]);

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
        attributeSetId: { value: attributeSetId, type: "id" },
      };
      const nextFilters = ["attributeSetId"];
      if (appliedStatus !== "" && appliedStatus !== null) {
        nextFilters.push("isActive");
        nextQuery.isActive = {
          value: appliedStatus === true || appliedStatus === "true",
          type: "Boolean",
        };
      }
      return {
        ...updated,
        filters: nextFilters.join(","),
        query: JSON.stringify(nextQuery),
      };
    });
  };

  const handleOpenEdit = (attribute) => {
    if (!attribute?._id) return;
    navigate(`/admin/attributes/edit/${attribute._id}`);
  };

  const handleOpenDelete = (attribute) => {
    setSelectedAttribute(attribute);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedAttribute(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedAttribute?._id) return;
    const result = await deleteAttribute(selectedAttribute._id);
    if (result?.status) {
      handleCloseDelete();
      await getAttributeList(params);
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attributes", link: "/admin/attributes" },
          { label: attributeSetName || "View List" },
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
            navigate(`/admin/attributes/create?attributeSetId=${attributeSetId}`)
          }
        >
          + Add Attribute
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
                      value={String(statusFilter)}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
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

      <AttributeTable
        data={attributes}
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
        title="Delete Attribute"
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
          Are you sure you want to delete{" "}
          <strong>{selectedAttribute?.name || "this attribute"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  attributeStore: state.attribute,
});

export default connect(mapStateToProps, {
  getAttributeList,
  deleteAttribute,
  getAttributeSetById,
})(AttributeViewList);
