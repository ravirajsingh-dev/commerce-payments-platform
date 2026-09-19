import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { removeErrors } from "@src/app/state/reducers/errors";
import { setErrorsList } from "@src/app/state/actions/errors";
import { logoutAuth } from "@src/features/auth/authReducer";

export const createHomepageCrudActions = ({
  entityName,
  listApi,
  createApi,
  updateApi,
  deleteApi,
  reducerActions,
}) => {
  const handleFailure = (dispatch, err, fallbackMessage) => {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return;
    }
    const errors = err.response?.data?.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(err.response?.data?.message || fallbackMessage, "danger"));
    dispatch(
      reducerActions.listError({
        msg: err.response?.statusText || fallbackMessage,
        status: err.response?.status || 500,
      }),
    );
  };

  const getList = () => async (dispatch) => {
    dispatch(reducerActions.loadingList());
    try {
      const res = await api.get(listApi, { allowDuplicates: true });
      if (res.data?.status) {
        dispatch(reducerActions.listFetched(res.data.response || []));
      } else {
        dispatch(reducerActions.listError({ msg: `Failed to fetch ${entityName}.` }));
      }
    } catch (err) {
      handleFailure(dispatch, err, `Failed to fetch ${entityName}.`);
    }
  };

  const getById = (id) => async (_dispatch) => {
    try {
      const res = await api.get(listApi, { allowDuplicates: true });
      if (!res.data?.status) return { status: false, data: null };
      const row = (res.data.response || []).find((item) => String(item._id) === String(id));
      return { status: Boolean(row), data: row || null };
    } catch (err) {
      return { status: false, data: null, error: err };
    }
  };

  const createOne = (formData) => async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(reducerActions.loadingSubmit());
    try {
      const res = await api.post(createApi, formData);
      dispatch(reducerActions.submitDone());
      if (res.data?.status) {
        dispatch(setAlert(res.data.message || `${entityName} created successfully.`, "success"));
        return { status: true };
      }
      dispatch(setAlert(res.data?.message || `Failed to create ${entityName}.`, "danger"));
      return { status: false };
    } catch (err) {
      dispatch(reducerActions.submitDone());
      handleFailure(dispatch, err, `Failed to create ${entityName}.`);
      return { status: false };
    }
  };

  const updateOne = (id, formData) => async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(reducerActions.loadingSubmit());
    try {
      const res = await api.put(updateApi(id), formData);
      dispatch(reducerActions.submitDone());
      if (res.data?.status) {
        dispatch(setAlert(res.data.message || `${entityName} updated successfully.`, "success"));
        return { status: true };
      }
      dispatch(setAlert(res.data?.message || `Failed to update ${entityName}.`, "danger"));
      return { status: false };
    } catch (err) {
      dispatch(reducerActions.submitDone());
      handleFailure(dispatch, err, `Failed to update ${entityName}.`);
      return { status: false };
    }
  };

  const deleteOne = (id) => async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(reducerActions.loadingSubmit());
    try {
      const res = await api.delete(deleteApi(id));
      dispatch(reducerActions.submitDone());
      if (res.data?.status) {
        dispatch(setAlert(res.data.message || `${entityName} deleted successfully.`, "success"));
        return { status: true };
      }
      dispatch(setAlert(res.data?.message || `Failed to delete ${entityName}.`, "danger"));
      return { status: false };
    } catch (err) {
      dispatch(reducerActions.submitDone());
      handleFailure(dispatch, err, `Failed to delete ${entityName}.`);
      return { status: false };
    }
  };

  return { getList, getById, createOne, updateOne, deleteOne };
};
