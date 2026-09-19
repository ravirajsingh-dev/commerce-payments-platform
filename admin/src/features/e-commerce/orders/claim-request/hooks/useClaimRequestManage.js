import { useCallback, useEffect, useState } from "react";
import {
  canApproveOrReject,
  canCompleteClaim,
  isTerminalClaimStatus,
} from "../claimRequestHelpers";

const emptyLogistics = () => ({
  courierName: "",
  trackingNumber: "",
});

const emptyResolution = () => ({
  resolutionCode: "",
  resolutionNote: "",
  paymentStatus: "",
  refundAmount: "",
});

const syncFromClaim = (claim) => {
  if (!claim) {
    return {
      claimStatus: "",
      claimDecisionNote: "",
      claimAdminNote: "",
      claimLogistics: emptyLogistics(),
    };
  }
  return {
    claimStatus: claim.status || "",
    claimDecisionNote: claim.decisionNote || "",
    claimAdminNote: claim.resolutionNote || "",
    claimLogistics: {
      courierName: claim.courierName || "",
      trackingNumber: claim.trackingNumber || "",
    },
  };
};

const useClaimRequestManage = ({
  orderNo,
  getOrderClaim,
  approveOrderClaim,
  rejectOrderClaim,
  updateOrderClaim,
  completeOrderClaim,
}) => {
  const [claim, setClaim] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [claimDecisionNote, setClaimDecisionNote] = useState("");
  const [claimAdminNote, setClaimAdminNote] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [claimLogistics, setClaimLogistics] = useState(emptyLogistics);
  const [claimResolution, setClaimResolution] = useState(emptyResolution);
  const [restockLines, setRestockLines] = useState([]);
  const [adminConfirmQc, setAdminConfirmQc] = useState(false);

  const loadClaim = useCallback(async () => {
    const normalized = String(orderNo || "").trim();
    if (!normalized) {
      setClaim(null);
      setOrderItems([]);
      return { status: false };
    }
    setLoadingClaim(true);
    const result = await getOrderClaim(normalized);
    if (result?.status) {
      const nextClaim = result.data?.claim || result.data || null;
      setClaim(nextClaim || null);
      setOrderItems(result.data?.orderItems || []);
      const synced = syncFromClaim(nextClaim);
      setClaimStatus(synced.claimStatus);
      setClaimDecisionNote(synced.claimDecisionNote);
      setClaimAdminNote(synced.claimAdminNote);
      setClaimLogistics(synced.claimLogistics);
    } else {
      setClaim(null);
      setOrderItems([]);
    }
    setLoadingClaim(false);
    return result;
  }, [getOrderClaim, orderNo]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  const handleApprove = async () => {
    if (!claim?.orderNo) return { status: false };
    const result = await approveOrderClaim(claim.orderNo, { decisionNote: claimDecisionNote });
    if (result?.status) await loadClaim();
    return result;
  };

  const handleReject = async () => {
    if (!claim?.orderNo) return { status: false };
    const result = await rejectOrderClaim(claim.orderNo, { decisionNote: claimDecisionNote });
    if (result?.status) await loadClaim();
    return result;
  };

  const handlePatch = async () => {
    if (!claim?.orderNo) return { status: false };
    const result = await updateOrderClaim(claim.orderNo, {
      status: claimStatus || undefined,
      adminNote: claimAdminNote,
      courierName: claimLogistics.courierName,
      trackingNumber: claimLogistics.trackingNumber,
    });
    if (result?.status) await loadClaim();
    return result;
  };

  const handleComplete = async () => {
    if (!claim?.orderNo) return { status: false };
    const payload = {
      resolutionCode: claimResolution.resolutionCode,
      resolutionNote: claimResolution.resolutionNote,
      paymentStatus: claimResolution.paymentStatus || undefined,
      refundAmount:
        claimResolution.refundAmount === "" ? undefined : Number(claimResolution.refundAmount),
    };

    if (restockLines.length > 0) {
      payload.restockLines = restockLines.map((line) => ({
        orderItemId: line.orderItemId,
        quantity: line.quantity,
        ...(line.adminConfirmRestock === true
          ? { adminConfirmRestock: true }
          : line.adminConfirmRestock === false
            ? { adminConfirmRestock: false }
            : {}),
      }));
      if (adminConfirmQc) {
        payload.adminConfirmQc = true;
      }
    }

    const result = await completeOrderClaim(claim.orderNo, payload);
    if (result?.status) {
      setClaimResolution(emptyResolution());
      setRestockLines([]);
      setAdminConfirmQc(false);
      await loadClaim();
    }
    return result;
  };

  return {
    claim,
    orderItems,
    loadingClaim,
    claimDecisionNote,
    setClaimDecisionNote,
    claimAdminNote,
    setClaimAdminNote,
    claimStatus,
    setClaimStatus,
    claimLogistics,
    setClaimLogistics,
    claimResolution,
    setClaimResolution,
    restockLines,
    setRestockLines,
    adminConfirmQc,
    setAdminConfirmQc,
    loadClaim,
    handleApprove,
    handleReject,
    handlePatch,
    handleComplete,
    canDecide: canApproveOrReject(claim?.status),
    canComplete: canCompleteClaim(claim?.status),
    isTerminal: isTerminalClaimStatus(claim?.status),
  };
};

export default useClaimRequestManage;
