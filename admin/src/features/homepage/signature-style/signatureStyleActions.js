import { createHomepageCrudActions } from "@src/features/homepage/shared/homepageCrudFactory";
import * as reducerActions from "./signatureStyleReducer";

const crud = createHomepageCrudActions({
  entityName: "signature style",
  listApi: "/api/admin/homepage/signature-styles/list",
  createApi: "/api/admin/homepage/signature-styles/create",
  updateApi: (id) => `/api/admin/homepage/signature-styles/${id}`,
  deleteApi: (id) => `/api/admin/homepage/signature-styles/${id}`,
  reducerActions,
});
export const getSignatureStyleList = crud.getList;
export const getSignatureStyleById = crud.getById;
export const createSignatureStyle = crud.createOne;
export const updateSignatureStyle = crud.updateOne;
export const deleteSignatureStyle = crud.deleteOne;
