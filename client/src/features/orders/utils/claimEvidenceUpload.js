import api from "@src/utils/axiosSetup";
import { readJsonApiResponse } from "@src/shared/utils/apiResponseHelpers";

const encodeOrderNo = (orderNo) => encodeURIComponent(String(orderNo || "").trim());

export const uploadClaimEvidenceFile = async (
  orderNo,
  file,
  category,
  { onProgress } = {},
) => {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);

  const res = await api.post(
    `/api/orders/${encodeOrderNo(orderNo)}/claim-evidence/upload`,
    body,
    {
      headers: { "Content-Type": "multipart/form-data" },
      allowDuplicates: true,
      ...(typeof onProgress === "function"
        ? {
            onUploadProgress: (event) => {
              if (!event.lengthComputable) return;
              onProgress({
                loaded: event.loaded,
                total: event.total,
              });
            },
          }
        : {}),
    },
  );

  const uploaded = readJsonApiResponse(res, "Unable to upload claim evidence.");
  return {
    url: uploaded.url,
    key: uploaded.key,
    label: file.name,
  };
};
