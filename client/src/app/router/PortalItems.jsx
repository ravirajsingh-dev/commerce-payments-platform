const PortalItems = [
  {
    label: "Home",
    path: "/",
    isAuth: false,
  },
  {
    label: "New Arrivals",
    path: "/new-arrivals",
    isAuth: false,
  },
  {
    label: "Shop",
    path: "/collections",
    isAuth: false,
    megaMenu: true,
  },
  {
    label: "About",
    isAuth: false,
    children: [
      { label: "About Us", path: "/about-us" },
      { label: "Contact Us", path: "/contact-us" },
    ],
  },
  {
    label: "Appointment",
    path: "/book-appointment",
    isAuth: false,
  },
];

export default PortalItems;
