export const DEFAULT_PAGE_SIZE = 20;

/** Shared initial params for CustomDataTable - use with useState(getInitialSortingParams()) */
const initialSortingParams = {
  limit: DEFAULT_PAGE_SIZE,
  page: 1,
  orderBy: "displayOrder",
  ascending: "asc",
  query: "",
};

/** Override specific fields if needed: getInitialSortingParams({ orderBy: "createdAt", ascending: "desc" }) */
export const getInitialSortingParams = (overrides = {}) => ({
  ...initialSortingParams,
  ...overrides,
});

export const PAGE_SIZE_OPTIONS = [
  {
    text: "10",
    page: 10,
  },
  {
    text: "20",
    page: 20,
  },
  {
    text: "50",
    page: 50,
  },
  {
    text: "100",
    page: 100,
  },
  {
    text: "200",
    page: 200,
  },
];


export const USER_STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
  { value: 3, label: "Blocked" },
  { value: 4, label: "New" },
];

export const USER_STATUS_LABEL_MAP = USER_STATUS_OPTIONS.reduce(
  (acc, item) => ({
    ...acc,
    [item.value]: item.label,
  }),
  {},
);

export const getStatusOptionByValue = (value) =>
  USER_STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) || null;

