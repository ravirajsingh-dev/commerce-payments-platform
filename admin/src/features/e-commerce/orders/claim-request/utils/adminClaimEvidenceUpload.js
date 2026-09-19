import api from "@src/utils/axiosSetup";

const encodeOrderNo = (orderNo) => encodeURIComponent(String(orderNo || "").trim());

export const uploadAdminClaimEvidenceFile = async (orderNo, file, category) => {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);

  const res = await api.post(
    `/api/admin/orders/${encodeOrderNo(orderNo)}/claim-evidence/upload`,
    body,
    {
      headers: { "Content-Type": "multipart/form-data" },
      allowDuplicates: true,
    },
  );

  if (!res?.data?.status) {
    const message = res?.data?.message || "Unable to upload claim evidence.";
    const err = new Error(message);
    err.errors = res?.data?.errors || [];
    throw err;
  }

  const uploaded = res.data.response || {};
  return {
    url: uploaded.url,
    key: uploaded.key,
    label: file.name,
  };
};
