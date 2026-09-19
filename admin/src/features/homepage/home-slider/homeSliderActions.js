import { createHomepageCrudActions } from "@src/features/homepage/shared/homepageCrudFactory";
import * as reducerActions from "./homeSliderReducer";

const crud = createHomepageCrudActions({
  entityName: "home slider",
  listApi: "/api/admin/homepage/sliders/list",
  createApi: "/api/admin/homepage/sliders/create",
  updateApi: (id) => `/api/admin/homepage/sliders/${id}`,
  deleteApi: (id) => `/api/admin/homepage/sliders/${id}`,
  reducerActions,
});

export const getHomeSliderList = crud.getList;
export const getHomeSliderById = crud.getById;
export const createHomeSlider = crud.createOne;
export const updateHomeSlider = crud.updateOne;
export const deleteHomeSlider = crud.deleteOne;
