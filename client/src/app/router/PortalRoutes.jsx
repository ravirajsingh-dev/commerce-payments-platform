import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "@src/app/layout/PublicLayout";
import PortalLayout from "@src/app/layout/PortalLayout";

// Auth Components
import Register from "@src/features/auth/Register";
import Login from "@src/features/auth/Login";

// Public Components
import Home from "@src/features/public/Home";
import AboutUs from "@src/features/public/AboutUs";
import ContactUs from "@src/features/public/ContactUs";
import CollectionPage from "@src/features/public/CollectionPage";
import AllVariantsCatalogPage from "@src/features/public/AllVariantsCatalogPage";
import NewArrivalsCatalogPage from "@src/features/public/NewArrivalsCatalogPage";
import CollectionsPage from "@src/features/public/CollectionsPage";
import ProductDetail from "@src/features/public/ProductDetail";
import StaticInfoPage from "@src/features/public/StaticInfoPage";
import LegalContentPage from "@src/features/public/LegalContentPage";
import BespokeAppointment from "@src/features/public/BespokeAppointment";
import SearchPage from "@src/features/public/SearchPage";
import CategoryVariantsPage from "@src/features/public/CategoryVariantsPage";

import MyAccount from "@src/features/user/MyAccount";
import CartPage from "@src/features/cart/CartPage";
import CheckoutPage from "@src/features/checkout/CheckoutPage";
import OrderConfirmationPage from "@src/features/checkout/OrderConfirmationPage";
import OrdersListPage from "@src/features/orders/OrdersListPage";
import OrderDetailPage from "@src/features/orders/OrderDetailPage";
import WishlistPage from "@src/features/wishlist/WishlistPage";

// Common Components
import NotFoundPage from "@src/components/common/NotFound/NotFoundPage";

const PortalRoutes = createBrowserRouter([
  // Public Routes (Unauthenticated)
  {
    path: "/register",
    name: "Register",
    element: <Register />,
  },
  {
    path: "/login",
    name: "Login",
    element: <Login />,
  },
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        name: "Home Page",
        element: <Home />,
      },
      {
        path: "/contact-us",
        name: "Contact US",
        element: <ContactUs />,
      },
      {
        path: "/book-appointment",
        name: "Book Appointment",
        element: <BespokeAppointment />,
      },
      {
        path: "/about-us",
        name: "About US",
        element: <AboutUs />,
      },
      {
        path: "/collections",
        name: "Collections",
        element: <CollectionsPage />,
      },
      {
        path: "/all-variants",
        name: "All Variants",
        element: <AllVariantsCatalogPage />,
      },
      {
        path: "/new-arrivals",
        name: "New Arrivals",
        element: <NewArrivalsCatalogPage />,
      },
      {
        path: "/search",
        name: "Search",
        element: <SearchPage />,
      },
      {
        path: "/category/:slug",
        name: "Category Variants",
        element: <CategoryVariantsPage />,
      },
      {
        path: "/collection/:slug",
        name: "Collection Page",
        element: <CollectionPage />,
      },
      {
        path: "/collection/:slug/:variantId",
        name: "Product Details",
        element: <ProductDetail />,
      },
      {
        path: "/cart",
        name: "Cart",
        element: <CartPage />,
      },
      {
        path: "/checkout",
        name: "Checkout",
        element: <CheckoutPage />,
      },
      {
        path: "/checkout/confirmation/:orderNo",
        name: "Order Confirmation",
        element: <OrderConfirmationPage />,
      },
      {
        path: "privacy-policy",
        name: "Privacy Policy",
        element: <LegalContentPage />,
      },
      {
        path: "terms-and-conditions",
        name: "Terms and Conditions",
        element: <LegalContentPage />,
      },
      {
        path: "returns-and-refunds",
        name: "Returns and Refunds",
        element: <LegalContentPage />,
      },
      {
        path: "stores",
        name: "Stores",
        element: <StaticInfoPage />,
      },
      {
        path: "wardrobe-solution",
        name: "Wardrobe Solution",
        element: <StaticInfoPage />,
      },
    ],
  },

  // Authenticated Routes (Protected by PortalLayout)
  {
    path: "/user",
    element: <PortalLayout />,
    children: [
      // Password Management Section
      {
        path: "my-account",
        element: <MyAccount />,
      },
      {
        path: "addresses",
        element: <Navigate to="/user/my-account?section=addresses" replace />,
      },
      {
        path: "change-login-password",
        element: <Navigate to="/user/my-account?section=password" replace />,
      },
      {
        path: "wishlist",
        element: <WishlistPage />,
      },
      {
        path: "orders",
        element: <OrdersListPage />,
      },
      {
        path: "orders/:orderNo",
        element: <OrderDetailPage />,
      },
      {
        path: "my-account/orders",
        element: <Navigate to="/user/orders" replace />,
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
