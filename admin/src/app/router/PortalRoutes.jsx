import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import PortalLayout from "@src/app/layout/PortalLayout";

// Auth Components
import Login from "@src/features/auth/Login";

// Dashboard Component
import Dashboard from "@src/features/dashboard/Dashboard";
import ApplicationSettings from "@src/features/settings/ApplicationSettings";
import LegalPagesManagement from "@src/features/settings/LegalPagesManagement";
import MyAccount from "@src/features/settings/MyAccount";

// Users Management
import UsersManagement from "@src/features/users/UsersManagement";
import CreateUser from "@src/features/users/CreateUser";
import EditUser from "@src/features/users/EditUser";
import {
  CategoryCreate,
  CategoryEdit,
  CategoryList,
} from "@src/features/e-commerce/catalog/category";
import {
  AttributeSetCreate,
  AttributeSetEdit,
  AttributeSetList,
} from "@src/features/e-commerce/catalog/attribute-set";
import {
  AttributeCreate,
  AttributeEdit,
  AttributeList,
  AttributeViewList,
} from "@src/features/e-commerce/catalog/attribute";
import {
  ProductCreate,
  ProductEdit,
  ProductList,
} from "@src/features/e-commerce/catalog/product";
import {
  ClaimPolicyCreate,
  ClaimPolicyEdit,
  ClaimPolicyList,
} from "@src/features/e-commerce/catalog/claim-policy";
import {
  ProductVariantCreate,
  ProductVariantEdit,
  ProductVariantList,
  ProductVariantViewList,
} from "@src/features/e-commerce/catalog/product-variant";
import {
  StoreNavSectionCreate,
  StoreNavSectionEdit,
  StoreNavSectionList,
} from "@src/features/e-commerce/catalog/store-navigation";
import {
  OrderDetail,
  OrderList,
  OrderManage,
} from "@src/features/e-commerce/orders";
import {
  ClaimRequestCreate,
  ClaimRequestDetail,
  ClaimRequestList,
} from "@src/features/e-commerce/orders/claim-request";
import { LowStockList, StockAdjustmentPage } from "@src/features/e-commerce/inventory";
import { CouponCreate, CouponEdit, CouponList } from "@src/features/e-commerce/coupons";
import {
  CarriersManagement,
  CreateCarrier,
  EditCarrier,
} from "@src/features/e-commerce/carriers";
import { ReviewList } from "@src/features/e-commerce/reviews";
import { SalesDashboardPage } from "@src/features/e-commerce/analytics";
import {
  BespokeAppointmentPageContent,
  BespokeAppointmentSettings,
  BespokeAppointmentSubmissions,
} from "@src/features/bespoke-appointment";
import {
  ClienteleCreate,
  ClienteleEdit,
  ClienteleList,
  HomeSliderCreate,
  HomeSliderEdit,
  HomeSliderList,
  ShowcaseCreate,
  ShowcaseEdit,
  ShowcaseList,
  SignatureStyleCreate,
  SignatureStyleEdit,
  SignatureStyleList,
} from "@src/features/homepage";

// Common Components
import NotFoundPage from "@src/components/common/NotFound/NotFoundPage";

const PortalRoutes = createBrowserRouter([
  // Public Routes (Unauthenticated)
  {
    path: "/login",
    name: "Login",
    element: <Login />,
  },
  { path: "/", element: <Navigate to="/login" replace /> },

  // Authenticated Routes (Protected by PortalLayout)
  {
    path: "/admin",
    element: <PortalLayout />,
    children: [
      // Dashboard
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "application-settings",
        element: <ApplicationSettings />,
      },
      {
        path: "legal-pages",
        element: <LegalPagesManagement />,
      },
      {
        path: "my-account",
        element: <MyAccount />,
      },
      {
        path: "users",
        element: <UsersManagement />,
      },
      {
        path: "users/create",
        element: <CreateUser />,
      },
      {
        path: "users/:userId/edit",
        element: <EditUser />,
      },
      {
        path: "orders",
        element: <OrderList />,
      },
      {
        path: "orders/:orderNo",
        element: <OrderDetail />,
      },
      {
        path: "orders/:orderNo/manage",
        element: <OrderManage />,
      },
      {
        path: "order-claims",
        element: <ClaimRequestList />,
      },
      {
        path: "order-claims/create",
        element: <ClaimRequestCreate />,
      },
      {
        path: "order-claims/:orderNo/manage",
        element: <ClaimRequestDetail />,
      },
      {
        path: "inventory",
        element: <LowStockList />,
      },
      {
        path: "inventory/stock-adjustments",
        element: <StockAdjustmentPage />,
      },
      {
        path: "coupons",
        element: <CouponList />,
      },
      {
        path: "coupons/create",
        element: <CouponCreate />,
      },
      {
        path: "coupons/edit/:couponId",
        element: <CouponEdit />,
      },
      {
        path: "carriers",
        element: <CarriersManagement />,
      },
      {
        path: "carriers/create",
        element: <CreateCarrier />,
      },
      {
        path: "carriers/:carrierId/edit",
        element: <EditCarrier />,
      },
      {
        path: "reviews",
        element: <ReviewList />,
      },
      {
        path: "analytics/sales",
        element: <SalesDashboardPage />,
      },
      {
        path: "categories",
        element: <CategoryList />,
      },
      {
        path: "categories/create",
        element: <CategoryCreate />,
      },
      {
        path: "categories/edit/:id",
        element: <CategoryEdit />,
      },
      {
        path: "attribute-sets",
        element: <AttributeSetList />,
      },
      {
        path: "attribute-sets/create",
        element: <AttributeSetCreate />,
      },
      {
        path: "attribute-sets/edit/:id",
        element: <AttributeSetEdit />,
      },
      {
        path: "attributes",
        element: <AttributeList />,
      },
      {
        path: "attributes/create",
        element: <AttributeCreate />,
      },
      {
        path: "attributes/edit/:id",
        element: <AttributeEdit />,
      },
      {
        path: "attributes/view/:attributeSetId",
        element: <AttributeViewList />,
      },
      {
        path: "products",
        element: <ProductList />,
      },
      {
        path: "claim-policies",
        element: <ClaimPolicyList />,
      },
      {
        path: "claim-policies/create",
        element: <ClaimPolicyCreate />,
      },
      {
        path: "claim-policies/edit/:id",
        element: <ClaimPolicyEdit />,
      },
      {
        path: "products/create",
        element: <ProductCreate />,
      },
      {
        path: "products/edit/:id",
        element: <ProductEdit />,
      },
      {
        path: "product-variants",
        element: <ProductVariantList />,
      },
      {
        path: "product-variants/add",
        element: <ProductVariantCreate />,
      },
      {
        path: "product-variants/edit/:variantId",
        element: <ProductVariantEdit />,
      },
      {
        path: "product-variants/view/:productId",
        element: <ProductVariantViewList />,
      },
      {
        path: "store-navigation",
        element: <StoreNavSectionList />,
      },
      {
        path: "store-navigation/create",
        element: <StoreNavSectionCreate />,
      },
      {
        path: "store-navigation/edit/:id",
        element: <StoreNavSectionEdit />,
      },
      {
        path: "home-slider-management",
        element: <HomeSliderList />,
      },
      {
        path: "home-slider-management/create",
        element: <HomeSliderCreate />,
      },
      {
        path: "home-slider-management/edit/:id",
        element: <HomeSliderEdit />,
      },
      {
        path: "showcase-section-management",
        element: <ShowcaseList />,
      },
      {
        path: "showcase-section-management/create",
        element: <ShowcaseCreate />,
      },
      {
        path: "showcase-section-management/edit/:id",
        element: <ShowcaseEdit />,
      },
      {
        path: "signature-styles-management",
        element: <SignatureStyleList />,
      },
      {
        path: "signature-styles-management/create",
        element: <SignatureStyleCreate />,
      },
      {
        path: "signature-styles-management/edit/:id",
        element: <SignatureStyleEdit />,
      },
      {
        path: "bespoke-appointment-settings",
        element: <BespokeAppointmentSettings />,
      },
      {
        path: "bespoke-appointment-settings/page-content",
        element: <BespokeAppointmentPageContent />,
      },
      {
        path: "bespoke-appointments",
        element: <BespokeAppointmentSubmissions />,
      },
      {
        path: "clientele-management",
        element: <ClienteleList />,
      },
      {
        path: "clientele-management/create",
        element: <ClienteleCreate />,
      },
      {
        path: "clientele-management/edit/:id",
        element: <ClienteleEdit />,
      },

      // 404 Page
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default PortalRoutes;
