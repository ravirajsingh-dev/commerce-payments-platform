import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Button, Card, Collapse, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaClipboardList,
  FaEdit,
  FaMapMarkerAlt,
  FaShoppingCart,
  FaTrash,
} from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import CopyIcon from "@src/components/common/CopyIcon";
import CustomDataTable from "@src/components/common/DataTable/CustomDataTable";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import AdvancedModal from "@src/components/common/Modal/AdvancedModal";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import SummaryStatsCards from "@src/components/common/SummaryStatsCards";
import UserAddressesPanel from "@src/features/users/components/UserAddressesPanel";
import UserCartPanel from "@src/features/users/components/UserCartPanel";
import UserCustomerAnalyticsPanel from "@src/features/users/components/UserCustomerAnalyticsPanel";
import UserOrdersPanel from "@src/features/users/components/UserOrdersPanel";
import {
  getInitialSortingParams,
  USER_STATUS_LABEL_MAP,
} from "@src/constants/index";
import { deleteUser, getUserById, getUsersList } from "./userActions";
import UserFilters from "./UserFilters";

const UsersManagement = ({
  usersStore,
  getUsersList,
  getUserById,
  deleteUser,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useState(
    getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    email: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [selectedSummaryStatus, setSelectedSummaryStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddressesModal, setShowAddressesModal] = useState(false);
  const [addressesUser, setAddressesUser] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [ordersUser, setOrdersUser] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartUser, setCartUser] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsUser, setAnalyticsUser] = useState(null);

  const { users, totalRecord, summary, loadingList, loadingSubmit } =
    usersStore;

  useEffect(() => {
    getUsersList(params);
  }, [getUsersList, params]);

  const applyFilters = (nextFiltersData) => {
    const nextQuery = {};
    const nextFilters = [];

    const name = String(nextFiltersData.name || "").trim();
    const phone = String(nextFiltersData.phone || "").trim();
    const email = String(nextFiltersData.email || "").trim();
    const fromDate = String(nextFiltersData.fromDate || "").trim();
    const toDate = String(nextFiltersData.toDate || "").trim();
    const statusValue =
      nextFiltersData.status !== "" && nextFiltersData.status !== null
        ? Number(nextFiltersData.status)
        : null;

    if (name) {
      nextFilters.push("name");
      nextQuery.name = { value: name, type: "String" };
    }
    if (phone) {
      nextFilters.push("phone");
      nextQuery.phone = { value: phone, type: "String" };
    }
    if (email) {
      nextFilters.push("email");
      nextQuery.email = { value: email, type: "String" };
    }

    if (statusValue !== null && !Number.isNaN(statusValue)) {
      nextFilters.push("status");
      nextQuery.status = { value: statusValue, type: "Number" };
    }
    if (fromDate && toDate) {
      nextFilters.push("createdAt");
      nextQuery.createdAt = { value: `${fromDate}|${toDate}`, type: "Date" };
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
    if (name === "status") {
      const nextStatus = value === "" ? null : Number(value);
      setSelectedSummaryStatus(
        [1, 2, 4].includes(nextStatus) ? nextStatus : null,
      );
    }
  };

  const onSearch = () => {
    const nextStatus =
      filters.status === "" || filters.status === null
        ? null
        : Number(filters.status);
    setSelectedSummaryStatus([1, 2, 4].includes(nextStatus) ? nextStatus : null);
    applyFilters(filters);
  };

  const onResetFilters = () => {
    const resetState = {
      name: "",
      phone: "",
      email: "",
      status: "",
      fromDate: "",
      toDate: "",
    };
    setSelectedSummaryStatus(null);
    setFilters(resetState);
    applyFilters(resetState);
  };

  const handleOpenCreate = () => {
    navigate("/admin/users/create");
  };

  const handleOpenEdit = (user) => {
    navigate(`/admin/users/${user._id}/edit`);
  };

  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleOpenAddresses = async (user) => {
    setAddressesUser(user);
    setShowAddressesModal(true);
    setLoadingAddresses(true);
    setUserAddresses([]);

    const result = await getUserById(user._id);
    if (result?.status) {
      setUserAddresses(result.data?.addresses || []);
    } else {
      setShowAddressesModal(false);
      setAddressesUser(null);
    }
    setLoadingAddresses(false);
  };

  const handleCloseAddresses = () => {
    setShowAddressesModal(false);
    setAddressesUser(null);
    setUserAddresses([]);
    setLoadingAddresses(false);
  };

  const handleOpenOrders = (user) => {
    setOrdersUser(user);
    setShowOrdersModal(true);
  };

  const handleCloseOrders = () => {
    setShowOrdersModal(false);
    setOrdersUser(null);
  };

  const handleOpenCart = (user) => {
    setCartUser(user);
    setShowCartModal(true);
  };

  const handleCloseCart = () => {
    setShowCartModal(false);
    setCartUser(null);
  };

  const handleOpenAnalytics = (user) => {
    setAnalyticsUser(user);
    setShowAnalyticsModal(true);
  };

  const handleCloseAnalytics = () => {
    setShowAnalyticsModal(false);
    setAnalyticsUser(null);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedUser?._id) return;
    const result = await deleteUser(selectedUser._id);
    if (result?.status) {
      handleCloseDelete();
      await getUsersList(params);
    }
  };

  const onSummaryCardClick = (statusValue) => {
    setSelectedSummaryStatus(statusValue);
    const nextFiltersData = {
      ...filters,
      status: statusValue === null ? "" : statusValue,
    };
    setFilters(nextFiltersData);
    applyFilters(nextFiltersData);
  };

  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        sortField: "name",
        minWidth: "170px",
        cell: (row) => (
          <span className="users-table__text" title={row.name || "-"}>
            {row.name || "-"}
          </span>
        ),
      },
      {
        name: "Phone",
        selector: (row) => row.phone,
        sortable: true,
        sortField: "phone",
        minWidth: "180px",
        cell: (row) => (
          <div className="users-table__copy-cell">
            <span className="users-table__text" title={row.phone || "-"}>
              {row.phone || "-"}
            </span>
            {row.phone ? (
              <CopyIcon textToCopy={row.phone} className="copy-action" iconSize={16} />
            ) : null}
          </div>
        ),
      },
      {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        sortField: "email",
        minWidth: "240px",
        cell: (row) => (
          <div className="users-table__copy-cell">
            <span className="users-table__text" title={row.email || "-"}>
              {row.email || "-"}
            </span>
            {row.email ? (
              <CopyIcon textToCopy={row.email} className="copy-action" iconSize={16} />
            ) : null}
          </div>
        ),
      },
      {
        name: "Created Date",
        selector: (row) => row.createdAt,
        sortable: true,
        sortField: "createdAt",
        minWidth: "190px",
        cell: (row) => (
          <span className="users-table__text users-table__date">
            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
          </span>
        ),
      },
      {
        name: "Status",
        sortable: true,
        sortField: "status",
        minWidth: "120px",
        cell: (row) => (
          <div className="entity-status-cell">
            <span
              className={`badge entity-status entity-status--${Number(row.status) === 1 ? "active" : "inactive"}`}
            >
              {USER_STATUS_LABEL_MAP[row.status] || "Unknown"}
            </span>
          </div>
        ),
      },
      {
        name: "Actions",
        width: "300px",
        minWidth: "300px",
        cell: (row) => (
          <div className="entity-table-actions entity-table-actions--nowrap">
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenAnalytics(row)}
              title="Customer analytics"
              aria-label="Customer analytics"
            >
              <FaChartLine />
            </Button>
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenAddresses(row)}
              title="View addresses"
              aria-label="View addresses"
            >
              <FaMapMarkerAlt />
            </Button>
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenOrders(row)}
              title="Order history"
              aria-label="Order history"
            >
              <FaClipboardList />
            </Button>
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenCart(row)}
              title="View cart"
              aria-label="View cart"
            >
              <FaShoppingCart />
            </Button>
            <Button
              type="button"
              className="btn btn--outline btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenEdit(row)}
              title="Edit user"
              aria-label="Edit user"
            >
              <FaEdit />
            </Button>
            <Button
              type="button"
              className="btn btn--danger btn-sm entity-table-actions__btn entity-table-actions__btn--icon"
              onClick={() => handleOpenDelete(row)}
              title="Delete user"
              aria-label="Delete user"
            >
              <FaTrash />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "Total",
        value: totalRecord,
        active: selectedSummaryStatus === null,
        onClick: () => onSummaryCardClick(null),
      },
      {
        label: "Active",
        value: summary?.active || 0,
        active: selectedSummaryStatus === 1,
        onClick: () => onSummaryCardClick(1),
      },
      {
        label: "Inactive",
        value: summary?.inactive || 0,
        active: selectedSummaryStatus === 2,
        onClick: () => onSummaryCardClick(2),
      },
      {
        label: "New",
        value: summary?.newUsers || 0,
        active: selectedSummaryStatus === 4,
        onClick: () => onSummaryCardClick(4),
      },
    ],
    [totalRecord, summary, selectedSummaryStatus, filters],
  );

  return (
    <Container>
      <AppBreadCrumb
        breadcrumbs={[
          { label: "Dashboard", link: "/admin/dashboard" },
          { label: "Users" },
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
          disabled={loadingSubmit}
        >
          Create User
        </Button>
      </div>

      <Collapse in={showFilters}>
        <div>
          <UserFilters
            values={filters}
            onChange={onFilterChange}
            onSearch={onSearch}
            onReset={onResetFilters}
          />
        </div>
      </Collapse>

      <SummaryStatsCards items={summaryItems} />

      <Card className="common-panel-card">
        <Card.Body>
          <CustomDataTable
            columns={columns}
            data={users || []}
            progressPending={loadingList}
            count={totalRecord || 0}
            params={params}
            setParams={setParams}
            minHeight="500px"
            persistTableHead
            noDataComponent={<NoRecordsFound description="No users found." />}
          />
        </Card.Body>
      </Card>

      <AdvancedModal
        show={showAnalyticsModal}
        onHide={handleCloseAnalytics}
        title={
          analyticsUser?.name
            ? `Customer analytics — ${analyticsUser.name}`
            : "Customer analytics"
        }
        size="lg"
        closeButton
        bodyClassName="common-modal-body--start admin-analytics-modal"
      >
        {analyticsUser?._id ? (
          <UserCustomerAnalyticsPanel
            key={analyticsUser._id}
            userId={analyticsUser._id}
            embedded
          />
        ) : null}
      </AdvancedModal>

      <AdvancedModal
        show={showAddressesModal}
        onHide={handleCloseAddresses}
        title={
          addressesUser?.name
            ? `Addresses — ${addressesUser.name}`
            : "Saved addresses"
        }
        size="md"
        closeButton
        bodyClassName="common-modal-body--start admin-addresses-modal"
      >
        {loadingAddresses ? (
          <BouncingLoader minHeight="120px" />
        ) : (
          <UserAddressesPanel addresses={userAddresses} embedded />
        )}
      </AdvancedModal>

      <AdvancedModal
        show={showCartModal}
        onHide={handleCloseCart}
        title={cartUser?.name ? `Cart — ${cartUser.name}` : "Customer cart"}
        size="xl"
        closeButton
        bodyClassName="common-modal-body--start admin-cart-modal"
      >
        {cartUser?._id ? (
          <UserCartPanel key={cartUser._id} userId={cartUser._id} embedded />
        ) : null}
      </AdvancedModal>

      <AdvancedModal
        show={showOrdersModal}
        onHide={handleCloseOrders}
        title={
          ordersUser?.name ? `Order history — ${ordersUser.name}` : "Order history"
        }
        size="xl"
        closeButton
        bodyClassName="common-modal-body--start admin-orders-modal"
      >
        {ordersUser?._id ? (
          <UserOrdersPanel
            key={ordersUser._id}
            userId={ordersUser._id}
            embedded
            onClose={handleCloseOrders}
          />
        ) : null}
      </AdvancedModal>

      <AdvancedModal
        show={showDeleteModal}
        onHide={handleCloseDelete}
        title="Delete User"
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
          <strong>{selectedUser?.name || "this user"}</strong>?
        </p>
      </AdvancedModal>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  usersStore: state.users,
});

export default connect(mapStateToProps, {
  getUsersList,
  getUserById,
  deleteUser,
})(UsersManagement);
