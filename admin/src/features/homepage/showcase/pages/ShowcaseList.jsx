import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import { deleteShowcase, getShowcaseList } from "../showcaseActions";
import ShowcaseFilters from "../components/ShowcaseFilters";
import ShowcaseTable from "../components/ShowcaseTable";

const ShowcaseList = ({ store, getShowcaseList, deleteShowcase }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ heading: "", isActive: "" });
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getShowcaseList();
  }, [getShowcaseList]);

  const filteredRows = useMemo(() => {
    return (store.items || []).filter((item) => {
      const byHeading =
        !filters.heading ||
        item.heading?.toLowerCase().includes(filters.heading.toLowerCase());
      const byStatus =
        filters.isActive === ""
          ? true
          : Boolean(item.isActive) === (filters.isActive === "true");
      return byHeading && byStatus;
    });
  }, [store.items, filters]);

  const onDelete = async () => {
    if (!selected?._id) return;
    const result = await deleteShowcase(selected._id);
    if (result?.status) {
      setSelected(null);
      getShowcaseList();
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Showcase Section Management" },
        ]}
      />
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Button
          className="btn btn--outline"
          onClick={() => setShowFilters((p) => !p)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
        <Button
          className="btn btn--theme"
          onClick={() => navigate("/admin/showcase-section-management/create")}
        >
          Create Showcase
        </Button>
      </div>
      <Collapse in={showFilters}>
        <div>
          <ShowcaseFilters
            values={filters}
            onChange={(e) =>
              setFilters((p) => ({ ...p, [e.target.name]: e.target.value }))
            }
            onSearch={() => {}}
            onReset={() => setFilters({ heading: "", isActive: "" })}
          />
        </div>
      </Collapse>
      <ShowcaseTable
        data={filteredRows}
        loadingList={store.loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) =>
          navigate(`/admin/showcase-section-management/edit/${row._id}`)
        }
        onDelete={setSelected}
      />
      <AdvancedModal
        show={Boolean(selected)}
        onHide={() => setSelected(null)}
        title="Delete Showcase"
        size="sm"
        actions={[
          {
            label: "Close",
            onClick: () => setSelected(null),
            className: "btn btn--outline",
            colSize: 5,
          },
          {
            label: store.loadingSubmit ? "Deleting..." : "Delete",
            onClick: onDelete,
            className: "btn btn--danger",
            colSize: 7,
          },
        ]}
      >
        <p className="mb-0">
          Delete <strong>{selected?.heading || "this item"}</strong>? All gallery
          images will be removed from storage.
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ store: state.showcase });
export default connect(mapStateToProps, { getShowcaseList, deleteShowcase })(
  ShowcaseList,
);
