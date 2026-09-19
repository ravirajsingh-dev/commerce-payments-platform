import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteStoreNavSection,
  getStoreNavSectionList,
} from "../storeNavSectionActions";
import StoreNavSectionTable from "../components/StoreNavSectionTable";

const StoreNavSectionList = ({
  storeNavSectionStore,
  getStoreNavSectionList,
  deleteStoreNavSection,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "columnIndex", ascending: "asc", limit: 50 }),
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const { sections, totalRecord, summary, loadingList, loadingSubmit } =
    storeNavSectionStore;

  useEffect(() => {
    getStoreNavSectionList(params);
  }, [getStoreNavSectionList, params]);

  const handleDelete = async () => {
    if (!selected?._id) return;
    const result = await deleteStoreNavSection(selected._id);
    if (result?.status) {
      setShowDeleteModal(false);
      setSelected(null);
      getStoreNavSectionList(params);
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Shop menu" },
        ]}
      />

      <div className="d-flex justify-content-end align-items-center mb-3">
        <Button
          type="button"
          className="btn btn--theme px-4 py-2"
          onClick={() => navigate("/admin/store-navigation/create")}
          disabled={loadingSubmit}
        >
          Add section
        </Button>
      </div>

      <SummaryStatsCards
        summary={summary}
        labels={{ active: "Active", inactive: "Inactive" }}
      />

      <StoreNavSectionTable
        data={sections}
        count={totalRecord}
        loadingList={loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) => navigate(`/admin/store-navigation/edit/${row._id}`)}
        onDelete={(row) => {
          setSelected(row);
          setShowDeleteModal(true);
        }}
      />

      <AdvancedModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        title="Delete section?"
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowDeleteModal(false),
            className: "btn btn--outline px-3 py-2",
            colSize: 5,
          },
          {
            label: loadingSubmit ? "Deleting..." : "Delete",
            onClick: handleDelete,
            className: "btn btn--danger px-3 py-2",
            disabled: loadingSubmit,
          },
        ]}
      >
        Delete &quot;{selected?.title}&quot;? This cannot be undone.
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  storeNavSectionStore: state.storeNavSection,
});

export default connect(mapStateToProps, {
  getStoreNavSectionList,
  deleteStoreNavSection,
})(StoreNavSectionList);
