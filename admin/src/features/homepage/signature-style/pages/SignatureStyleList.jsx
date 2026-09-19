import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import { getInitialSortingParams } from "@src/constants";
import {
  deleteSignatureStyle,
  getSignatureStyleList,
} from "../signatureStyleActions";
import SignatureStyleFilters from "../components/SignatureStyleFilters";
import SignatureStyleTable from "../components/SignatureStyleTable";

const SignatureStyleList = ({
  store,
  getSignatureStyleList,
  deleteSignatureStyle,
}) => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ title: "", isActive: "" });
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "order", ascending: "asc" }),
  );
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getSignatureStyleList();
  }, [getSignatureStyleList]);

  const rows = useMemo(
    () =>
      (store.items || []).filter((x) => {
        const byTitle =
          !filters.title ||
          x.title?.toLowerCase().includes(filters.title.toLowerCase());
        const byStatus =
          filters.isActive === ""
            ? true
            : Boolean(x.isActive) === (filters.isActive === "true");
        return byTitle && byStatus;
      }),
    [store.items, filters],
  );

  const onDelete = async () => {
    if (!selected?._id) return;
    const r = await deleteSignatureStyle(selected._id);
    if (r?.status) {
      setSelected(null);
      getSignatureStyleList();
    }
  };

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Signature Styles Management" },
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
          onClick={() => navigate("/admin/signature-styles-management/create")}
        >
          Create Style
        </Button>
      </div>
      <Collapse in={showFilters}>
        <div>
          <SignatureStyleFilters
            values={filters}
            onChange={(e) =>
              setFilters((p) => ({ ...p, [e.target.name]: e.target.value }))
            }
            onReset={() => setFilters({ title: "", isActive: "" })}
          />
        </div>
      </Collapse>
      <SignatureStyleTable
        data={rows}
        loadingList={store.loadingList}
        params={params}
        setParams={setParams}
        onEdit={(row) =>
          navigate(`/admin/signature-styles-management/edit/${row._id}`)
        }
        onDelete={setSelected}
      />
      <AdvancedModal
        show={Boolean(selected)}
        onHide={() => setSelected(null)}
        title="Delete Signature Style"
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
          Delete <strong>{selected?.title || "this item"}</strong>? The tile
          image will be removed from storage.
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({ store: state.signatureStyle });
export default connect(mapStateToProps, {
  getSignatureStyleList,
  deleteSignatureStyle,
})(SignatureStyleList);
