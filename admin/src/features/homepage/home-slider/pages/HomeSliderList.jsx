import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import HomeSliderFilters from "../components/HomeSliderFilters";
import HomeSliderTable from "../components/HomeSliderTable";
import { deleteHomeSlider, getHomeSliderList } from "../homeSliderActions";

const HomeSliderList = ({ store, getHomeSliderList, deleteHomeSlider }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ heading: "", status: "" });
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "order", ascending: "asc" }),
  );
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getHomeSliderList();
  }, [getHomeSliderList]);

  const filteredRows = useMemo(() => {
    return (store.items || []).filter((item) => {
      const byHeading =
        !filters.heading ||
        item.heading?.toLowerCase().includes(filters.heading.toLowerCase());
      const byStatus =
        filters.status === ""
          ? true
          : Boolean(item.status) === (filters.status === "true");
      return byHeading && byStatus;
    });
  }, [store.items, filters]);

  const onDelete = async () => {
    if (!selected?._id) return;
    const result = await deleteHomeSlider(selected._id);
    if (result?.status) {
      setSelected(null);
      getHomeSliderList();
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Home Slider Management" },
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
          onClick={() => navigate("/admin/home-slider-management/create")}
        >
          Create Slide
        </Button>
      </div>
      <Collapse in={showFilters}>
        <div>
          <HomeSliderFilters
            values={filters}
            onChange={(e) =>
              setFilters((p) => ({ ...p, [e.target.name]: e.target.value }))
            }
            onSearch={() => {}}
            onReset={() => setFilters({ heading: "", status: "" })}
          />
        </div>
      </Collapse>
      <HomeSliderTable
        data={filteredRows}
        loadingList={store.loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) =>
          navigate(`/admin/home-slider-management/edit/${row._id}`)
        }
        onDelete={setSelected}
      />
      <AdvancedModal
        show={Boolean(selected)}
        onHide={() => setSelected(null)}
        title="Delete Slide"
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
          Delete <strong>{selected?.heading || "this item"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ store: state.homeSlider });
export default connect(mapStateToProps, {
  getHomeSliderList,
  deleteHomeSlider,
})(HomeSliderList);
