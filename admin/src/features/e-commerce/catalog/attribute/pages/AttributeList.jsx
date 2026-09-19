import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import { getInitialSortingParams } from "@src/constants";
import {
  getAttributesOverview,
} from "@src/features/e-commerce/catalog/attribute/attributeActions";
import AttributeSetFilters from "@src/features/e-commerce/catalog/attribute-set/components/AttributeSetFilters";
import AttributeSetsOverview from "@src/features/e-commerce/catalog/attribute/components/AttributeSetsOverview";

const AttributeList = ({ getAttributesOverview }) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "name", ascending: "asc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [totalRecord, setTotalRecord] = useState(0);
  const [attributeSetOverviewData, setAttributeSetOverviewData] = useState([]);
  const [filters, setFilters] = useState({
    name: "",
    status: "",
  });

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingCounts(true);
      const res = await getAttributesOverview(params);
      setAttributeSetOverviewData(res?.status ? res.data?.rows || [] : []);
      setTotalRecord(res?.status ? Number(res.data?.totalRecord || 0) : 0);
      setLoadingCounts(false);
    };
    loadOverview();
  }, [getAttributesOverview, params]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? nextFiltersData.status === true || nextFiltersData.status === "true"
        : null;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (statusValue !== null) {
      nextFilters.push("isActive");
      nextQuery.isActive = { value: statusValue, type: "Boolean" };
    }

    setParams((prev) => ({
      ...prev,
      page: 1,
      filters: nextFilters.join(","),
      query: Object.keys(nextQuery).length ? JSON.stringify(nextQuery) : "",
    }));
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const onSearch = () => {
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      status: "",
    };
    setFilters(resetState);
    applyFilters(resetState);
  };

  const handleOpenCreate = () => {
    navigate("/admin/attributes/create");
  };
  const handleAddAttributeForSet = (attributeSetId) => {
    if (!attributeSetId) {
      handleOpenCreate();
      return;
    }
    navigate(`/admin/attributes/create?attributeSetId=${attributeSetId}`);
  };
  const handleViewList = (attributeSetId) => {
    if (!attributeSetId) return;
    navigate(`/admin/attributes/view/${attributeSetId}`);
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Attributes" },
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
          onClick={handleOpenCreate}
        >
          Create Attribute
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <AttributeSetFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <AttributeSetsOverview
        data={attributeSetOverviewData}
        count={totalRecord}
        loading={loadingCounts}
        params={params}
        setParams={setParams}
        onViewList={handleViewList}
        onAddAttribute={handleAddAttributeForSet}
      />
    </Container>
  );
};

export default connect(null, {
  getAttributesOverview,
})(AttributeList);
