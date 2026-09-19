import { createHomepageCrudActions } from "@src/features/homepage/shared/homepageCrudFactory";
import * as reducerActions from "./clienteleReducer";

const crud = createHomepageCrudActions({
  entityName: "clientele",
  listApi: "/api/admin/homepage/clientele/list",
  createApi: "/api/admin/homepage/clientele/create",
  updateApi: (id) => `/api/admin/homepage/clientele/${id}`,
  deleteApi: (id) => `/api/admin/homepage/clientele/${id}`,
  reducerActions,
});
export const getClienteleList = crud.getList;
export const getClienteleById = crud.getById;
export const createClientele = crud.createOne;
export const updateClientele = crud.updateOne;
export const deleteClientele = crud.deleteOne;
