import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import { deleteClientele, getClienteleList } from "../clienteleActions";
import ClienteleFilters from "../components/ClienteleFilters";
import ClienteleTable from "../components/ClienteleTable";

const ClienteleList = ({ store, getClienteleList, deleteClientele }) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ name: "", isActive: "" });
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "order", ascending: "asc" }),
  );
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getClienteleList();
  }, [getClienteleList]);

  const rows = useMemo(
    () =>
      (store.items || []).filter((x) => {
        const byName =
          !filters.name ||
          x.name?.toLowerCase().includes(filters.name.toLowerCase());
        const byStatus =
          filters.isActive === ""
            ? true
            : Boolean(x.isActive) === (filters.isActive === "true");
        return byName && byStatus;
      }),
    [store.items, filters],
  );

  const onDelete = async () => {
    if (!selected?._id) return;
    const r = await deleteClientele(selected._id);
    if (r?.status) {
      setSelected(null);
      getClienteleList();
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Clientele Management" },
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
          onClick={() => navigate("/admin/clientele-management/create")}
        >
          Create Clientele
        </Button>
      </div>
      <Collapse in={showFilters}>
        <div>
          <ClienteleFilters
            values={filters}
            onChange={(e) =>
              setFilters((p) => ({ ...p, [e.target.name]: e.target.value }))
            }
            onReset={() => setFilters({ name: "", isActive: "" })}
          />
        </div>
      </Collapse>
      <ClienteleTable
        data={rows}
        loadingList={store.loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) =>
          navigate(`/admin/clientele-management/edit/${row._id}`)
        }
        onDelete={setSelected}
      />
      <AdvancedModal
        show={Boolean(selected)}
        onHide={() => setSelected(null)}
        title="Delete Clientele"
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
          Delete <strong>{selected?.name || "this item"}</strong>? The image
          will be removed from storage.
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ store: state.clientele });
export default connect(mapStateToProps, { getClienteleList, deleteClientele })(
  ClienteleList,
);
