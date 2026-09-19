import {
  FaBookOpen,
  FaBoxOpen,
  FaBoxes,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaCubes,
  FaExchangeAlt,
  FaExclamationCircle,
  FaFileContract,
  FaGem,
  FaHandshake,
  FaImages,
  FaLayerGroup,
  FaListUl,
  FaShoppingCart,
  FaSitemap,
  FaSlidersH,
  FaStar,
  FaTags,
  FaTachometerAlt,
  FaThLarge,
  FaTicketAlt,
  FaTruck,
  FaUserCog,
  FaUsers,
} from "react-icons/fa";

/**
 * Admin portal menu — grouped sections.
 * `requiresAuth`: whole section only when logged in.
 */
const PORTAL_MENU = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    Icon: FaTachometerAlt,
    requiresAuth: true,
  },
  {
    label: "Settings",
    Icon: FaSlidersH,
    requiresAuth: true,
    children: [
      {
        label: "Application Settings",
        path: "/admin/application-settings",
        Icon: FaCog,
      },
      {
        label: "Legal & policy pages",
        path: "/admin/legal-pages",
        Icon: FaFileContract,
      },
      {
        label: "My Account",
        path: "/admin/my-account",
        Icon: FaUserCog,
      },
      {
        label: "Home Slider Management",
        path: "/admin/home-slider-management",
        Icon: FaImages,
      },
      {
        label: "Showcase Section Management",
        path: "/admin/showcase-section-management",
        Icon: FaThLarge,
      },
      {
        label: "Signature Styles Management",
        path: "/admin/signature-styles-management",
        Icon: FaGem,
      },
      {
        label: "Clientele Management",
        path: "/admin/clientele-management",
        Icon: FaHandshake,
      },
    ],
  },
  {
    label: "Commerce",
    Icon: FaShoppingCart,
    requiresAuth: true,
    children: [
      {
        label: "Orders",
        path: "/admin/orders",
        Icon: FaClipboardList,
      },
      {
        label: "Claim Requests",
        path: "/admin/order-claims",
        Icon: FaClipboardList,
      },
      {
        label: "Sales analytics",
        path: "/admin/analytics/sales",
        Icon: FaChartLine,
      },
      {
        label: "Coupons",
        path: "/admin/coupons",
        Icon: FaTicketAlt,
      },
      {
        label: "Carriers",
        path: "/admin/carriers",
        Icon: FaTruck,
      },
      {
        label: "Reviews",
        path: "/admin/reviews",
        Icon: FaStar,
      },
    ],
  },
  {
    label: "Users",
    path: "/admin/users",
    Icon: FaUsers,
    permission: { module: "users", action: "list" },
  },
  {
    label: "Inventory",
    Icon: FaBoxes,
    requiresAuth: true,
    children: [
      {
        label: "Low Stock",
        path: "/admin/inventory",
        Icon: FaExclamationCircle,
      },
      {
        label: "Stock Adjustments",
        path: "/admin/inventory/stock-adjustments",
        Icon: FaExchangeAlt,
      },
    ],
  },
  {
    label: "Catalog",
    Icon: FaBookOpen,
    requiresAuth: true,
    children: [
      {
        label: "Categories",
        path: "/admin/categories",
        Icon: FaSitemap,
        permission: { module: "category", action: "list" },
      },
      {
        label: "Attribute Sets",
        path: "/admin/attribute-sets",
        Icon: FaLayerGroup,
        permission: { module: "attributeSet", action: "list" },
      },
      {
        label: "Attributes",
        path: "/admin/attributes",
        Icon: FaTags,
        permission: { module: "attribute", action: "list" },
      },
      {
        label: "Products",
        path: "/admin/products",
        Icon: FaBoxOpen,
        permission: { module: "product", action: "list" },
      },
      {
        label: "Claim Policies",
        path: "/admin/claim-policies",
        Icon: FaClipboardList,
        permission: { module: "product", action: "list" },
      },
      {
        label: "Product Variants",
        path: "/admin/product-variants",
        Icon: FaCubes,
        permission: { module: "product", action: "list" },
      },
      {
        label: "Shop Menu",
        path: "/admin/store-navigation",
        Icon: FaListUl,
        permission: { module: "product", action: "list" },
      },
    ],
  },
  {
    label: "Bespoke Appointments",
    Icon: FaCalendarAlt,
    requiresAuth: true,
    children: [
      {
        label: "Page & service options",
        path: "/admin/bespoke-appointment-settings",
        Icon: FaCog,
      },
      {
        label: "Appointment requests",
        path: "/admin/bespoke-appointments",
        Icon: FaCalendarCheck,
      },
    ],
  },
];

/** Menu for sidebar — filtered by auth */
const canAccess = (permissions, permissionConfig) => {
  if (!permissionConfig) return true;
  const modulePermissions = permissions?.[permissionConfig.module];
  if (modulePermissions === undefined) return false;
  if (typeof modulePermissions === "boolean") return modulePermissions;
  if (!permissionConfig.action)
    return Object.values(modulePermissions || {}).some(Boolean);
  return Boolean(modulePermissions?.[permissionConfig.action]);
};

export const getSidebarMenu = (
  isAuthenticated,
  permissions = {},
  isAdmin = false,
) =>
  PORTAL_MENU.map((section) => {
    if (section.requiresAuth && !isAuthenticated) return null;
    if (!isAdmin && !canAccess(permissions, section.permission)) return null;
    if (section.children?.length) {
      const children = section.children.filter(
        (child) => isAdmin || canAccess(permissions, child.permission),
      );
      if (!children.length) return null;
      return { ...section, children };
    }
    return section;
  }).filter(Boolean);

/** Leaf items for collapsed icon-only list — top-level links + nested children */
export const flattenMenuForCollapsed = (menu) =>
  menu.flatMap((section) => {
    if (section.children?.length) {
      return section.children.map((child) => ({
        label: child.label,
        path: child.path,
        Icon: child.Icon,
      }));
    }
    if (section.path) {
      return [
        {
          label: section.label,
          path: section.path,
          Icon: section.Icon,
        },
      ];
    }
    return [];
  });
