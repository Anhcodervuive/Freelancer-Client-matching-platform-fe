import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  Clock,
  Gavel,
  Handshake,
  Layers,
  Loader2,
  Pencil,
  ScrollText,
  Scale,
  ShieldAlert,
  Wallet2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  createDisputeNegotiation,
  deleteDisputeNegotiation,
  getContractDetail,
  getMilestoneDispute,
  listContractMilestones,
  openMilestoneDispute,
  respondDisputeNegotiation,
  updateDisputeNegotiation,
} from "~/apis/contract.api";
import { routes } from "~/config/routes";
import { selectCurrentUser } from "~/redux/user/userSlice";
import type { Contract, ContractMilestone } from "~/types/contract";
import type {
  DisputeContractSummary,
  DisputeMilestoneSummary,
  DisputeNegotiation,
  MilestoneDisputeSummary,
} from "~/types/dispute";
import { DisputeNegotiationStatus, DisputeStatus } from "~/types/dispute";
import { formatCurrency, formatDateTime } from "~/utils/format";
import {
  DisputeNegotiationSchema,
  OpenDisputeSchema,
  RejectNegotiationSchema,
  type DisputeNegotiationFormOutput,
  type OpenDisputeFormOutput,
  type RejectNegotiationFormValues,
} from "./schemas";
import MediationEvidenceSection from "~/components/mediation-evidence/MediationEvidenceSection";

const DISPUTE_FINAL_STATUSES = new Set<DisputeStatus | string>([
  DisputeStatus.RESOLVED_RELEASE_ALL,
  DisputeStatus.RESOLVED_REFUND_ALL,
  DisputeStatus.RESOLVED_SPLIT,
  DisputeStatus.CANCELED,
  DisputeStatus.EXPIRED,
]);

const FINALIZED_MILESTONE_STATUSES = new Set<string>([
  "APPROVED",
  "RELEASED",
  "COMPLETED",
  "PAID",
  "CANCELLED",
  "CANCELED",
]);

const NEGOTIATION_HISTORY_STORAGE_KEY =
  "contract-dispute-room:show-negotiation-history";

const formatMilestoneStatus = (status?: string | null) => {
  if (!status) return undefined;
  const normalized = status.toString().trim();
  if (!normalized) return undefined;
  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const parseAmount = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getDisputeStatusMeta = (status?: string) => {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case DisputeStatus.OPEN:
      return {
        label: "Đang mở dispute",
        tone: "pending" as const,
        badge: "border-amber-200 bg-amber-50/80 text-amber-700",
      };
    case DisputeStatus.NEGOTIATION:
      return {
        label: "Đang thương lượng",
        tone: "negotiation" as const,
        badge: "border-sky-200 bg-sky-50/80 text-sky-700",
      };
    case DisputeStatus.INTERNAL_MEDIATION:
      return {
        label: "Admin đang hòa giải",
        tone: "negotiation" as const,
        badge: "border-indigo-200 bg-indigo-50/80 text-indigo-700",
      };
    case DisputeStatus.AWAITING_ARBITRATION_FEES:
    case DisputeStatus.ARBITRATION_READY:
    case DisputeStatus.ARBITRATION:
      return {
        label: "Đang xử lý tranh chấp",
        tone: "negotiation" as const,
        badge: "border-sky-200 bg-sky-50/80 text-sky-700",
      };
    case DisputeStatus.RESOLVED_RELEASE_ALL:
      return {
        label: "Giải quyết: giải ngân toàn bộ",
        tone: "success" as const,
        badge: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
      };
    case DisputeStatus.RESOLVED_REFUND_ALL:
      return {
        label: "Giải quyết: hoàn trả toàn bộ",
        tone: "success" as const,
        badge: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
      };
    case DisputeStatus.RESOLVED_SPLIT:
      return {
        label: "Giải quyết: chia đôi",
        tone: "success" as const,
        badge: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
      };
    case DisputeStatus.CANCELED:
      return {
        label: "Đã hủy",
        tone: "warning" as const,
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
    case DisputeStatus.EXPIRED:
      return {
        label: "Đã hết hạn",
        tone: "warning" as const,
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
    default:
      return {
        label: "Không xác định",
        tone: "neutral" as const,
        badge: "border-slate-200 bg-slate-100 text-slate-600",
      };
  }
};

const getNegotiationStatusMeta = (status?: string) => {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case DisputeNegotiationStatus.ACCEPTED:
      return {
        label: "Đã chấp nhận",
        badge: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
      };
    case DisputeNegotiationStatus.REJECTED:
      return {
        label: "Đã từ chối",
        badge: "border-rose-200 bg-rose-50/80 text-rose-700",
      };
    case DisputeNegotiationStatus.WITHDRAWN:
      return {
        label: "Đã rút lại",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
    case DisputeNegotiationStatus.EXPIRED:
      return {
        label: "Đã hết hạn",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
    default:
      return {
        label: "Đang chờ phản hồi",
        badge: "border-amber-200 bg-amber-50/80 text-amber-700",
      };
  }
};

const getPartyLabel = (
  user: DisputeNegotiation["proposer"] | DisputeNegotiation["counterparty"],
  {
    candidateId,
    clientId,
    freelancerId,
    currentUserId,
  }: {
    candidateId?: string | null;
    clientId?: string | null;
    freelancerId?: string | null;
    currentUserId?: string | null;
  },
) => {
  const displayName = getUserDisplayName(user, currentUserId ?? undefined);

  if (displayName && displayName !== "Người dùng") {
    return displayName;
  }

  const resolvedCandidateId = user?.id ?? candidateId ?? null;

  if (resolvedCandidateId) {
    if (clientId && resolvedCandidateId === clientId) return "Khách hàng";
    if (freelancerId && resolvedCandidateId === freelancerId) return "Freelancer";
    return resolvedCandidateId.length > 8
      ? `Người dùng #${resolvedCandidateId.slice(0, 8)}`
      : `Người dùng #${resolvedCandidateId}`;
  }

  return displayName;
};

const getUserDisplayName = (
  user: DisputeNegotiation["proposer"] | DisputeNegotiation["counterparty"],
  currentUserId?: string,
) => {
  if (!user) {
    return "Người dùng";
  }

  if (user.id && currentUserId && user.id === currentUserId) {
    return "Bạn";
  }

  const firstName = (user.firstName ?? user.profile?.firstName ?? "").trim();
  const lastName = (user.lastName ?? user.profile?.lastName ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return "Người dùng";
};

const isDisputeClosed = (status?: string) => {
  if (!status) return false;
  return DISPUTE_FINAL_STATUSES.has(status.toUpperCase());
};

type NegotiationAction = "accept" | "reject" | "withdraw" | "edit" | "delete";

type NegotiationActionState = {
  negotiation: DisputeNegotiation | null;
  action: NegotiationAction | null;
};

type DisputeTabId =
  | "overview"
  | "negotiations"
  | "actions"
  | "evidence";

type ConfirmModalProps = {
  title: string;
  description?: string;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmActionModal = ({
  title,
  description,
  confirmLabel,
  confirmTone = "primary",
  isSubmitting,
  onConfirm,
  onClose,
}: ConfirmModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-base-200 bg-base-100 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-base-content">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-base-content/70">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn btn-sm ${confirmTone === "danger" ? "btn-error" : "btn-primary"}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

type EditNegotiationModalProps = {
  negotiation: DisputeNegotiation;
  currency?: string;
  isSubmitting?: boolean;
  onSubmit: (_values: DisputeNegotiationFormOutput) => void;
  onClose: () => void;
};

const EditNegotiationModal = ({
  negotiation,
  currency,
  isSubmitting,
  onSubmit,
  onClose,
}: EditNegotiationModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DisputeNegotiationFormOutput>({
    resolver: zodResolver(
      DisputeNegotiationSchema,
    ) as Resolver<DisputeNegotiationFormOutput>,
    defaultValues: {
      releaseAmount: parseAmount(negotiation.releaseAmount) ?? 0,
      refundAmount: parseAmount(negotiation.refundAmount) ?? 0,
      message: negotiation.message ?? undefined,
    },
  });

  useEffect(() => {
    reset({
      releaseAmount: parseAmount(negotiation.releaseAmount) ?? 0,
      refundAmount: parseAmount(negotiation.refundAmount) ?? 0,
      message: negotiation.message ?? undefined,
    });
  }, [negotiation, reset]);

  const handleFormSubmit = (values: DisputeNegotiationFormOutput) => {
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-base-200 bg-base-100 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-base-content">
              Chỉnh sửa đề xuất
            </h3>
            <p className="mt-1 text-sm text-base-content/70">
              Cập nhật số tiền và thông điệp mà bạn muốn đề xuất với bên còn
              lại.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-5 px-6 py-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Trả cho freelancer
                {currency && (
                  <span className="font-normal text-base-content/60">
                    {" "}
                    ({currency})
                  </span>
                )}
              </label>
              <Controller
                name="releaseAmount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.value ?? 0}
                    onChange={(event) => {
                      const raw = event.target.value;
                      field.onChange(raw === "" ? 0 : Number(raw));
                    }}
                    className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                  />
                )}
              />
              {errors.releaseAmount && (
                <p className="text-xs text-error">
                  {errors.releaseAmount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Hoàn lại cho client
                {currency && (
                  <span className="font-normal text-base-content/60">
                    {" "}
                    ({currency})
                  </span>
                )}
              </label>
              <Controller
                name="refundAmount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.value ?? 0}
                    onChange={(event) => {
                      const raw = event.target.value;
                      field.onChange(raw === "" ? 0 : Number(raw));
                    }}
                    className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                  />
                )}
              />
              {errors.refundAmount && (
                <p className="text-xs text-error">
                  {errors.refundAmount.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Thông điệp
            </label>
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={4}
                  value={field.value ?? ""}
                  className="textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100"
                  placeholder="Chia sẻ thêm bối cảnh hoặc đề xuất chi tiết hơn cho bên còn lại."
                />
              )}
            />
            {errors.message && (
              <p className="text-xs text-error">{errors.message.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type RejectNegotiationModalProps = {
  isSubmitting?: boolean;
  onSubmit: (_values: RejectNegotiationFormValues) => void;
  onClose: () => void;
};

const RejectNegotiationModal = ({
  isSubmitting,
  onSubmit,
  onClose,
}: RejectNegotiationModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RejectNegotiationFormValues>({
    resolver: zodResolver(
      RejectNegotiationSchema,
    ) as Resolver<RejectNegotiationFormValues>,
    defaultValues: {
      responseMessage: "",
    },
  });

  useEffect(() => {
    reset({ responseMessage: "" });
  }, [reset]);

  const handleFormSubmit = (values: RejectNegotiationFormValues) => {
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-base-200 bg-base-100 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-base-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-base-content">
              Từ chối đề xuất
            </h3>
            <p className="mt-1 text-sm text-base-content/70">
              Hãy chia sẻ lý do để bên còn lại hiểu rõ quan điểm của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4 px-6 py-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Thông điệp phản hồi
            </label>
            <textarea
              {...register("responseMessage")}
              rows={5}
              className="textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100"
              placeholder="Chia sẻ vì sao bạn không đồng ý với đề xuất này và gợi ý hướng xử lý khác."
            />
            {errors.responseMessage && (
              <p className="text-xs text-error">
                {errors.responseMessage.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-error btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi…" : "Từ chối đề xuất"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ContractDisputeRoomPage = () => {
  const { contractId, milestoneId } = useParams<{
    contractId: string;
    milestoneId: string;
  }>();
  const currentUser = useSelector(selectCurrentUser);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const disputeQueryKey = [
    "contract-dispute",
    contractId,
    milestoneId,
  ] as const;

  const contractQuery = useQuery<Contract>({
    queryKey: ["contract", contractId],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) {
        throw new Error("Thiếu mã hợp đồng");
      }
      return getContractDetail(contractId);
    },
  });

  const milestonesQuery = useQuery<ContractMilestone[]>({
    queryKey: ["contract-milestones", contractId],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) {
        throw new Error("Thiếu mã hợp đồng");
      }
      return listContractMilestones(contractId);
    },
  });

  const disputeQuery = useQuery<MilestoneDisputeSummary | null>({
    queryKey: disputeQueryKey,
    enabled: Boolean(contractId && milestoneId),
    queryFn: async () => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      return getMilestoneDispute(contractId, milestoneId);
    },
  });

  const {
    control: openDisputeControl,
    handleSubmit: handleOpenDisputeSubmit,
    formState: { errors: openDisputeErrors },
    reset: resetOpenDisputeForm,
  } = useForm<OpenDisputeFormOutput>({
    resolver: zodResolver(OpenDisputeSchema) as Resolver<OpenDisputeFormOutput>,
    defaultValues: {
      proposedRelease: 0,
      proposedRefund: 0,
      note: undefined,
      reason: "",
    },
  });

  const {
    control: negotiationControl,
    handleSubmit: handleNegotiationSubmit,
    formState: { errors: negotiationErrors },
    reset: resetNegotiationForm,
  } = useForm<DisputeNegotiationFormOutput>({
    resolver: zodResolver(
      DisputeNegotiationSchema,
    ) as Resolver<DisputeNegotiationFormOutput>,
    defaultValues: {
      releaseAmount: 0,
      refundAmount: 0,
      message: undefined,
    },
  });

  const [actionState, setActionState] = useState<NegotiationActionState>({
    negotiation: null,
    action: null,
  });
  const [showNegotiationHistory, setShowNegotiationHistory] = useState<boolean>(
    () => {
      if (typeof window === "undefined") {
        return true;
      }

      const storedValue = window.localStorage.getItem(
        NEGOTIATION_HISTORY_STORAGE_KEY,
      );

      if (storedValue === "true") {
        return true;
      }

      if (storedValue === "false") {
        return false;
      }

      return true;
    },
  );
  const [activeTab, setActiveTab] = useState<DisputeTabId>("overview");
  const negotiationHistoryPanelId = useId();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      NEGOTIATION_HISTORY_STORAGE_KEY,
      showNegotiationHistory ? "true" : "false",
    );
  }, [showNegotiationHistory]);

  const openDisputeMutation = useMutation({
    mutationFn: async (values: OpenDisputeFormOutput) => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      const payload: OpenDisputeFormOutput = {
        proposedRelease: values.proposedRelease,
        proposedRefund: values.proposedRefund,
        note: values.note,
        reason: values.reason,
      };
      return openMilestoneDispute(contractId, milestoneId, payload);
    },
    onSuccess: async () => {
      toast.success("Đã mở dispute cho milestone này.");
      resetOpenDisputeForm({
        proposedRelease: 0,
        proposedRefund: 0,
        note: undefined,
        reason: "",
      });
      await queryClient.invalidateQueries({ queryKey: disputeQueryKey });
      await queryClient.invalidateQueries({
        queryKey: ["contract-milestones", contractId],
      });
    },
  });

  const createNegotiationMutation = useMutation({
    mutationFn: async ({
      disputeId,
      values,
    }: {
      disputeId: string;
      values: DisputeNegotiationFormOutput;
    }) => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      return createDisputeNegotiation(
        contractId,
        milestoneId,
        disputeId,
        values,
      );
    },
    onSuccess: async () => {
      toast.success("Đã gửi đề xuất mới tới bên còn lại.");
      resetNegotiationForm({
        releaseAmount: 0,
        refundAmount: 0,
        message: undefined,
      });
      await queryClient.invalidateQueries({ queryKey: disputeQueryKey });
    },
  });

  const updateNegotiationMutation = useMutation({
    mutationFn: async ({
      disputeId,
      negotiationId,
      payload,
    }: {
      disputeId: string;
      negotiationId: string;
      payload: Partial<DisputeNegotiationFormOutput> & {
        status?: DisputeNegotiationStatus;
        responseMessage?: string;
      };
    }) => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      return updateDisputeNegotiation(
        contractId,
        milestoneId,
        disputeId,
        negotiationId,
        payload,
      );
    },
    onSuccess: async (_data, variables) => {
      switch (variables.payload.status) {
        case DisputeNegotiationStatus.ACCEPTED:
          toast.success("Bạn đã chấp nhận đề xuất này.");
          break;
        case DisputeNegotiationStatus.REJECTED:
          toast.info("Bạn đã từ chối đề xuất.");
          break;
        case DisputeNegotiationStatus.WITHDRAWN:
          toast.success("Đã rút lại đề xuất.");
          break;
        default:
          toast.success("Đã cập nhật đề xuất.");
      }
      await queryClient.invalidateQueries({ queryKey: disputeQueryKey });
      setActionState({ negotiation: null, action: null });
    },
  });

  const respondNegotiationMutation = useMutation({
    mutationFn: async ({
      disputeId,
      negotiationId,
      payload,
    }: {
      disputeId: string;
      negotiationId: string;
      payload: { action: "accept" | "reject"; message?: string };
    }) => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      return respondDisputeNegotiation(
        contractId,
        milestoneId,
        disputeId,
        negotiationId,
        payload,
      );
    },
    onSuccess: async (_data, variables) => {
      if (variables.payload.action === "accept") {
        toast.success("Bạn đã chấp nhận đề xuất này.");
      } else {
        toast.info("Bạn đã từ chối đề xuất.");
      }
      await queryClient.invalidateQueries({ queryKey: disputeQueryKey });
      setActionState({ negotiation: null, action: null });
    },
  });

  const deleteNegotiationMutation = useMutation({
    mutationFn: async ({
      disputeId,
      negotiationId,
    }: {
      disputeId: string;
      negotiationId: string;
    }) => {
      if (!contractId || !milestoneId) {
        throw new Error("Thiếu thông tin dispute");
      }
      return deleteDisputeNegotiation(
        contractId,
        milestoneId,
        disputeId,
        negotiationId,
      );
    },
    onSuccess: async () => {
      toast.success("Đã xóa đề xuất khỏi dispute.");
      await queryClient.invalidateQueries({ queryKey: disputeQueryKey });
      setActionState({ negotiation: null, action: null });
    },
  });

  const milestoneDispute = disputeQuery.data;
  const contractFromPayload = milestoneDispute?.contract ?? null;
  const milestones = useMemo(
    () => milestonesQuery.data ?? [],
    [milestonesQuery.data],
  );
  const contract = useMemo<DisputeContractSummary | Contract | null>(() => {
    if (contractFromPayload) {
      return contractFromPayload;
    }
    return contractQuery.data ?? null;
  }, [contractFromPayload, contractQuery.data]);

  const milestoneFromPayload = milestoneDispute?.milestone ?? null;
  const milestone = useMemo<
    DisputeMilestoneSummary | ContractMilestone | undefined
  >(() => {
    if (milestoneFromPayload) {
      return milestoneFromPayload;
    }
    if (!milestoneId) return undefined;
    return milestones.find((item) => item.id === milestoneId);
  }, [milestoneFromPayload, milestoneId, milestones]);

  const dispute = milestoneDispute?.dispute ?? null;
  const currentUserId = currentUser?.id ?? null;
  const disputeStatusMeta = getDisputeStatusMeta(dispute?.status);
  const clientEvidenceSubmitted =
    dispute?.clientEvidenceSubmitted ?? dispute?.clientEvidenceSubmited ?? null;
  const freelancerEvidenceSubmitted =
    dispute?.freelancerEvidenceSubmitted ??
    dispute?.freelancerEvidenceSubmited ??
    null;
  const hasSubmittedEvidence = dispute?.hasSubmittedEvidence ?? null;
  const isEvidenceSubmissionStage = Boolean(dispute?.status);
  const isMediationStage = dispute?.status === DisputeStatus.INTERNAL_MEDIATION;
  const contractEntity = (contract as Contract | null) ?? null;
  const contractSummary = (contract as DisputeContractSummary | null) ?? null;
  const contractClientId =
    contractEntity?.client?.userId ??
    contractSummary?.clientId ??
    milestoneDispute?.contract?.clientId ??
    null;
  const isClientParty = Boolean(
    currentUserId && contractClientId && currentUserId === contractClientId,
  );
  const contractFreelancerId =
    contractEntity?.freelancer?.userId ??
    contractSummary?.freelancerId ??
    milestoneDispute?.contract?.freelancerId ??
    null;
  const isFreelancerParty = Boolean(
    currentUserId &&
      contractFreelancerId &&
      currentUserId === contractFreelancerId,
  );

  const clientDisplayName =
    (
      (contractEntity?.client?.profile?.firstName ?? "") +
      " " +
      (contractEntity?.client?.profile?.lastName ?? "")
    ).trim() || "Khách hàng";
  const freelancerDisplayName =
    (
      (contractEntity?.freelancer?.profile?.firstName ?? "") +
      " " +
      (contractEntity?.freelancer?.profile?.lastName ?? "")
    ).trim() || "Freelancer";

  const openedByUser =
    dispute?.openedBy ??
    (dispute?.openedById
      ? ({ id: dispute.openedById } as DisputeNegotiation["proposer"])
      : null);
  const openedByLabel = getPartyLabel(openedByUser, {
    candidateId: openedByUser?.id ?? dispute?.openedById ?? null,
    clientId: contractClientId,
    freelancerId: contractFreelancerId,
    currentUserId,
  });

  const currency =
    milestone?.currency ||
    contract?.fixedPriceCurrency ||
    contract?.hourlyRateCurrency ||
    contract?.totalPaidCurrency ||
    "USD";

  const milestoneAmount = formatCurrency(
    parseAmount(milestone?.amount),
    currency,
  );
  const proposedRelease = formatCurrency(
    parseAmount(dispute?.proposedRelease),
    currency,
  );
  const proposedRefund = formatCurrency(
    parseAmount(dispute?.proposedRefund),
    currency,
  );
  const disputableAmount = formatCurrency(
    parseAmount(milestoneDispute?.disputableAmount),
    currency,
  );
  const disputableCentsValue = parseAmount(milestoneDispute?.disputableCents);
  const disputableCents =
    typeof disputableCentsValue === "number"
      ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
          disputableCentsValue,
        )
      : undefined;

  const milestoneEscrow =
    milestone?.escrow ?? milestoneFromPayload?.escrow ?? null;
  const normalizedMilestoneStatus = (milestone?.status ?? "")
    .toString()
    .toUpperCase();
  const normalizedEscrowStatus = (milestoneEscrow?.status ?? "")
    .toString()
    .toUpperCase();
  const isMilestoneCancelled =
    normalizedMilestoneStatus === "CANCELLED" ||
    normalizedMilestoneStatus === "CANCELED";
  const milestoneStatusLabel = formatMilestoneStatus(milestone?.status);
  const escrowCurrency = milestoneEscrow?.currency || currency;
  const escrowFunded = formatCurrency(
    parseAmount(milestoneEscrow?.amountFunded),
    escrowCurrency,
  );
  const escrowReleasedValue = parseAmount(milestoneEscrow?.amountReleased);
  const escrowReleased = formatCurrency(escrowReleasedValue, escrowCurrency);
  const escrowRefunded = formatCurrency(
    parseAmount(milestoneEscrow?.amountRefunded),
    escrowCurrency,
  );
  const milestoneUpdatedAt = formatDateTime(
    milestoneFromPayload?.updatedAt ??
      milestone?.updatedAt ??
      milestoneFromPayload?.endAt ??
      milestoneFromPayload?.endDate ??
      milestone?.endDate ??
      milestoneFromPayload?.startAt ??
      milestone?.startDate,
  );
  const disputeCreatedAt = formatDateTime(dispute?.createdAt);
  const disputeUpdatedAt = formatDateTime(dispute?.updatedAt);
  const hasEscrowReleased =
    typeof escrowReleasedValue === "number" && escrowReleasedValue > 0;
  const hasApprovedTimeline = Boolean(
    milestone?.approvedAt || milestone?.releasedAt,
  );
  const isMilestoneFinalized =
    FINALIZED_MILESTONE_STATUSES.has(normalizedMilestoneStatus) ||
    FINALIZED_MILESTONE_STATUSES.has(normalizedEscrowStatus) ||
    hasApprovedTimeline ||
    hasEscrowReleased;
  const shouldBlockOpeningDispute =
    isMilestoneFinalized ||
    isMilestoneCancelled ||
    normalizedEscrowStatus === "DISPUTED" ||
    normalizedEscrowStatus === "RELEASED" ||
    normalizedEscrowStatus === "PAID";
  const blockDisputeDescription = isMilestoneCancelled
    ? "Milestone đã bị hủy nên không thể mở tranh chấp mới. Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ bộ phận hỗ trợ."
    : "Milestone đã được duyệt/giải ngân nên không thể mở tranh chấp mới. Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ bộ phận hỗ trợ.";
  const negotiations = useMemo(() => {
    const list: DisputeNegotiation[] = [];
    if (milestoneDispute?.negotiations?.length) {
      list.push(
        ...(milestoneDispute.negotiations.filter(
          Boolean,
        ) as DisputeNegotiation[]),
      );
    }
    if (dispute?.negotiations?.length) {
      list.push(
        ...(dispute.negotiations.filter(Boolean) as DisputeNegotiation[]),
      );
    }
    if (
      dispute?.latestProposal &&
      !list.some((item) => item.id === dispute.latestProposal?.id)
    ) {
      list.push(dispute.latestProposal);
    }
    const deduped: DisputeNegotiation[] = [];
    const seen = new Set<string>();
    for (const negotiation of list) {
      if (!negotiation?.id) continue;
      if (seen.has(negotiation.id)) continue;
      seen.add(negotiation.id);
      deduped.push(negotiation);
    }
    return deduped.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [
    dispute?.latestProposal,
    dispute?.negotiations,
    milestoneDispute?.negotiations,
  ]);

  const isFinalDispute = isDisputeClosed(dispute?.status);
  const hasPendingNegotiation = negotiations.some(
    (item) => item.status === DisputeNegotiationStatus.PENDING,
  );
  const hasDispute = Boolean(dispute);
  const isNegotiationLocked = isFinalDispute;
  const shouldShowEvidenceTab = Boolean(dispute?.id && (isEvidenceSubmissionStage || currentUser?.role === 'ADMIN'));
  const tabItems = useMemo(() => {
    const items: { id: DisputeTabId; label: string }[] = [
      { id: "overview", label: "Tổng quan" },
    ];

    if (hasDispute) {
      items.push({ id: "negotiations", label: "Thương lượng" });

      if (shouldShowEvidenceTab) {
        items.push({ id: "evidence", label: "Hồ sơ & chứng cứ" });
      }
    } else {
      items.push({ id: "actions", label: "Mở dispute" });
    }

    return items;
  }, [hasDispute, shouldShowEvidenceTab]);

  useEffect(() => {
    if (!tabItems.length) {
      return;
    }

    if (!tabItems.some((item) => item.id === activeTab)) {
      setActiveTab(tabItems[0].id);
    }
  }, [activeTab, tabItems]);

  const requestAction = (
    negotiation: DisputeNegotiation,
    action: NegotiationAction,
  ) => {
    setActionState({ negotiation, action });
  };

  const closeActionDialog = () =>
    setActionState({ negotiation: null, action: null });

  const handleAcceptNegotiation = () => {
    if (!dispute?.id || !actionState.negotiation) return;
    respondNegotiationMutation.mutate({
      disputeId: dispute.id,
      negotiationId: actionState.negotiation.id,
      payload: { action: "accept" },
    });
  };

  const handleWithdrawNegotiation = () => {
    if (!dispute?.id || !actionState.negotiation) return;
    updateNegotiationMutation.mutate({
      disputeId: dispute.id,
      negotiationId: actionState.negotiation.id,
      payload: { status: DisputeNegotiationStatus.WITHDRAWN },
    });
  };

  const handleDeleteNegotiation = () => {
    if (!dispute?.id || !actionState.negotiation) return;
    deleteNegotiationMutation.mutate({
      disputeId: dispute.id,
      negotiationId: actionState.negotiation.id,
    });
  };

  const handleRejectNegotiation = (values: RejectNegotiationFormValues) => {
    if (!dispute?.id || !actionState.negotiation) return;
    respondNegotiationMutation.mutate({
      disputeId: dispute.id,
      negotiationId: actionState.negotiation.id,
      payload: {
        action: "reject",
        message: values.responseMessage,
      },
    });
  };

  const handleEditNegotiation = (values: DisputeNegotiationFormOutput) => {
    if (!dispute?.id || !actionState.negotiation) return;
    updateNegotiationMutation.mutate({
      disputeId: dispute.id,
      negotiationId: actionState.negotiation.id,
      payload: values,
    });
  };

  const isLoading =
    disputeQuery.isLoading ||
    !contractId ||
    !milestoneId ||
    (contractQuery.isLoading && !contractFromPayload) ||
    (milestonesQuery.isLoading && !milestoneFromPayload);

  if (!contractId || !milestoneId) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error">
          Thiếu thông tin hợp đồng hoặc milestone. Vui lòng quay lại trang
          trước.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center px-4 py-10 text-base-content/70">
        <div className="flex items-center gap-3 rounded-3xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Đang tải dữ liệu dispute…</span>
        </div>
      </div>
    );
  }

  if (
    (contractQuery.isError && !contractFromPayload) ||
    (milestonesQuery.isError && !milestoneFromPayload)
  ) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error">
          Không thể tải dữ liệu hợp đồng.{" "}
          {(contractQuery.error as Error)?.message || ""}
        </div>
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error">
          Không tìm thấy milestone bạn yêu cầu. Vui lòng quay lại và thử lại.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-0">
      <div className="mb-6 flex items-center gap-3 text-sm text-base-content/70">
        <ArrowLeft className="size-4" />
        <button
          type="button"
          className="link link-hover text-primary"
          onClick={() => navigate(routes.contracts.detail(contractId))}
        >
          Quay lại workroom
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-base-200/70 bg-base-100/80 p-6 shadow-lg backdrop-blur">
        <div
          className="pointer-events-none absolute -right-20 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-12 h-48 w-48 rounded-full bg-sky-100/40 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                <Scale className="size-4" /> Dispute center
              </div>
              <h1 className="text-3xl font-semibold text-base-content">
                {contract?.title ?? "Dispute room"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70">
                <span>
                  Milestone:{" "}
                  <span className="font-medium text-base-content">
                    {milestone.title}
                  </span>
                </span>
                {milestoneAmount && (
                  <span className="text-base-content/60">
                    · {milestoneAmount}
                  </span>
                )}
                {milestoneStatusLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-base-200 bg-base-100/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
                    {milestoneStatusLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${disputeStatusMeta.badge}`}
              >
                <span className="size-2 rounded-full bg-current"></span>
                {disputeStatusMeta.label}
              </span>
              {disputeUpdatedAt && (
                <span className="text-xs text-base-content/60">
                  Cập nhật:{" "}
                  <strong className="text-base-content">
                    {disputeUpdatedAt}
                  </strong>
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-base-content/70">
            {dispute
              ? `Phòng tranh chấp giữa ${clientDisplayName} và ${freelancerDisplayName}.`
              : "Milestone hiện chưa có dispute. Bạn có thể mở dispute khi cần hỗ trợ từ nền tảng."}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-2 border-b border-base-200 pb-2 text-sm font-medium">
          {tabItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`rounded-full px-4 py-1.5 transition ${
                  isActive
                    ? "bg-primary text-primary-content shadow-sm"
                    : "text-base-content/70 hover:text-base-content"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <section className="space-y-3 rounded-3xl border border-base-200/70 bg-base-100/80 p-5 shadow-sm lg:col-span-2 xl:col-span-3">
                <h2 className="text-sm font-semibold text-base-content">
                  Số liệu nhanh
                </h2>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary/80 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                        <CircleDollarSign className="size-4" /> Tổng milestone
                      </div>
                      <span className="text-[11px] font-medium text-primary/70">
                        Escrow
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-primary">
                      {milestoneAmount ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-800 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      <BarChart3 className="size-4" /> Khoản tranh chấp
                    </div>
                    <p className="mt-2 text-xl font-semibold">
                      {disputableAmount ?? "—"}
                    </p>
                    {disputableCents && (
                      <p className="text-xs text-amber-700/80">
                        ≈ {disputableCents} cent
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <section className="space-y-4 rounded-3xl border border-base-200/70 bg-base-100/80 p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-base-content">
                    Milestone & escrow
                  </h2>
                  {milestoneStatusLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-base-200 bg-base-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">
                      {milestoneStatusLabel}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-3 rounded-2xl border border-base-200/80 bg-base-100/90 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Layers className="size-4" />
                      </span>
                      <p className="text-sm font-semibold text-base-content">
                        Milestone
                      </p>
                    </div>
                    <dl className="space-y-3 text-xs text-base-content/70">
                      <div className="flex items-center justify-between gap-2">
                        <dt>Số tiền</dt>
                        <dd className="font-medium text-base-content">
                          {milestoneAmount ?? "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt>Cập nhật</dt>
                        <dd className="font-medium text-base-content">
                          {milestoneUpdatedAt ?? "—"}
                        </dd>
                      </div>
                      {shouldBlockOpeningDispute && (
                        <div className="flex items-center justify-between gap-2 text-error">
                          <dt>Tranh chấp mới</dt>
                          <dd className="font-medium">Không khả dụng</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-base-200/80 bg-base-100/90 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <Wallet2 className="size-4" />
                      </span>
                      <p className="text-sm font-semibold text-base-content">
                        Escrow
                      </p>
                    </div>
                    <dl className="space-y-3 text-xs text-base-content/70">
                      <div className="flex items-center justify-between gap-2">
                        <dt>Trạng thái</dt>
                        <dd className="font-medium text-base-content">
                          {milestoneEscrow?.status ?? "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt>Đã nạp</dt>
                        <dd className="font-medium text-base-content">
                          {escrowFunded ?? "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt>Đã giải ngân</dt>
                        <dd className="font-medium text-base-content">
                          {escrowReleased ?? "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt>Đã hoàn</dt>
                        <dd className="font-medium text-base-content">
                          {escrowRefunded ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>
              <section className="rounded-3xl border border-base-200/70 bg-base-100/80 p-5 text-sm text-base-content/80 shadow-sm">
                <div className="flex items-center gap-2 text-base font-semibold text-base-content">
                  <ScrollText className="size-4 text-amber-600" /> Chi tiết
                  dispute
                </div>
                <dl className="mt-3 space-y-3 text-xs text-base-content/70">
                  <div className="flex items-center justify-between gap-2">
                    <dt>Mã dispute</dt>
                    <dd className="break-all font-medium text-base-content">
                      {dispute?.id ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Mở bởi</dt>
                    <dd className="break-all font-medium text-base-content">
                      {openedByLabel ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Khoản tranh chấp</dt>
                    <dd className="font-medium text-base-content">
                      {disputableAmount ?? "—"}
                    </dd>
                  </div>
                  {disputableCents && (
                    <div className="flex items-center justify-between gap-2">
                      <dt>Giá trị (cent)</dt>
                      <dd className="font-medium text-base-content">
                        {disputableCents}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <dt>Tạo lúc</dt>
                    <dd className="font-medium text-base-content">
                      {disputeCreatedAt ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>Cập nhật</dt>
                    <dd className="font-medium text-base-content">
                      {disputeUpdatedAt ?? "—"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="space-y-3 rounded-3xl border border-base-200/70 bg-base-100/80 p-5 text-sm text-base-content/80 shadow-sm">
                <div className="flex items-center gap-2 text-base font-semibold text-base-content">
                  <Gavel className="size-4 text-primary" /> Trạng thái dispute
                </div>
                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${disputeStatusMeta.badge}`}
                >
                  <span className="size-2 rounded-full bg-current"></span>
                  {disputeStatusMeta.label}
                </span>
                {dispute?.responseDeadline && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-700/90">
                    <Clock className="size-4 text-amber-600" />
                    <span>
                      Hạn phản hồi:{" "}
                      <strong>
                        {formatDateTime(dispute.responseDeadline)}
                      </strong>
                    </span>
                  </div>
                )}
                {proposedRelease && proposedRefund && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-900/80">
                    <p className="font-semibold">Đề xuất ban đầu</p>
                    <p>
                      Trả freelancer:{" "}
                      <span className="font-semibold text-sky-900">
                        {proposedRelease}
                      </span>
                    </p>
                    <p>
                      Hoàn client:{" "}
                      <span className="font-semibold text-sky-900">
                        {proposedRefund}
                      </span>
                    </p>
                  </div>
                )}
              </section>
              {dispute?.note && (
                <section className="rounded-3xl border border-primary/40 bg-primary/5 p-5 text-sm text-base-content/80 shadow-sm lg:col-span-2 xl:col-span-3">
                  <p className="flex items-start gap-3">
                    <ShieldAlert className="mt-1 size-4 text-primary" />
                    <span>
                      <strong>Ghi chú dispute:</strong> {dispute.note}
                    </span>
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === "negotiations" && (
            <div className="space-y-6">
              {!hasDispute ? (
                <div className="rounded-3xl border border-dashed border-base-200 bg-base-50/80 p-6 text-sm text-base-content/80">
                  <div className="flex items-center gap-3 text-base-content">
                    <Handshake className="size-5 text-primary" />
                    <div>
                      <p className="text-base font-semibold">Chưa có dispute</p>
                      <p className="text-sm text-base-content/70">
                        Bạn có thể mở dispute ở tab "Mở dispute" khi cần hỗ trợ
                        từ nền tảng.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {isNegotiationLocked ? (
                    <div
                      className={`rounded-2xl px-5 py-4 text-sm ${
                        isFinalDispute
                          ? "border border-success/40 bg-success/10 text-success"
                          : "border border-violet-200/70 bg-violet-50/70 text-violet-700"
                      }`}
                    >
                      {isFinalDispute
                        ? "Dispute đã kết thúc. Bạn vẫn có thể xem lại lịch sử thương lượng bên dưới."
                        : "Dispute tạm thời bị khóa. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thêm giúp đỡ."}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-base-200 bg-base-50/80 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <Handshake className="size-5 text-primary" />
                        <div>
                          <p className="text-base font-semibold text-base-content">
                            Gửi đề xuất thương lượng
                          </p>
                          <p className="text-sm text-base-content/70">
                            Đề xuất chia quỹ escrow để hai bên thảo luận và
                            thống nhất.
                          </p>
                        </div>
                      </div>
                      <form
                        onSubmit={handleNegotiationSubmit((values) => {
                          if (!dispute?.id) return;
                          createNegotiationMutation.mutate({
                            disputeId: dispute.id,
                            values,
                          });
                        })}
                        className="space-y-5"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-base-content">
                              Trả cho freelancer
                              <span className="font-normal text-base-content/60">
                                {" "}
                                ({currency})
                              </span>
                            </label>
                            <Controller
                              name="releaseAmount"
                              control={negotiationControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    field.onChange(
                                      raw === "" ? 0 : Number(raw),
                                    );
                                  }}
                                  className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                                  disabled={createNegotiationMutation.isPending}
                                />
                              )}
                            />
                            {negotiationErrors.releaseAmount && (
                              <p className="text-xs text-error">
                                {negotiationErrors.releaseAmount.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-base-content">
                              Hoàn lại cho client
                              <span className="font-normal text-base-content/60">
                                {" "}
                                ({currency})
                              </span>
                            </label>
                            <Controller
                              name="refundAmount"
                              control={negotiationControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={field.value ?? 0}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    field.onChange(
                                      raw === "" ? 0 : Number(raw),
                                    );
                                  }}
                                  className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                                  disabled={createNegotiationMutation.isPending}
                                />
                              )}
                            />
                            {negotiationErrors.refundAmount && (
                              <p className="text-xs text-error">
                                {negotiationErrors.refundAmount.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-base-content">
                            Thông điệp tới bên còn lại
                          </label>
                          <Controller
                            name="message"
                            control={negotiationControl}
                            render={({ field }) => (
                              <textarea
                                {...field}
                                rows={4}
                                value={field.value ?? ""}
                                className="textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100"
                                placeholder="Chia sẻ lý do phân chia khoản thanh toán như vậy hoặc đề xuất kế hoạch hợp tác tiếp theo."
                                disabled={createNegotiationMutation.isPending}
                              />
                            )}
                          />
                          {negotiationErrors.message && (
                            <p className="text-xs text-error">
                              {negotiationErrors.message.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-base-content/60">
                          <div>
                            {hasPendingNegotiation
                              ? "Bạn đã có một đề xuất đang chờ phản hồi. Bạn vẫn có thể gửi đề xuất mới để cập nhật các điều khoản."
                              : "Đề xuất mới sẽ thay thế đề xuất trước đó của bạn nếu có."}
                          </div>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createNegotiationMutation.isPending}
                          >
                            {createNegotiationMutation.isPending
                              ? "Đang gửi…"
                              : "Gửi đề xuất"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                  <div className="space-y-4 rounded-2xl border border-base-200 bg-base-50/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Gavel className="size-5 text-primary" />
                        <div>
                          <p className="text-base font-semibold text-base-content">
                            Lịch sử thương lượng
                          </p>
                          <p className="text-sm text-base-content/70">
                            Theo dõi tiến trình làm việc giữa hai bên và phản
                            hồi nhanh chóng.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-xs"
                        onClick={() =>
                          setShowNegotiationHistory((prev) => !prev)
                        }
                        aria-expanded={showNegotiationHistory}
                        aria-controls={negotiationHistoryPanelId}
                        title={
                          showNegotiationHistory
                            ? "Thu gọn lịch sử thương lượng"
                            : "Mở rộng lịch sử thương lượng"
                        }
                      >
                        {showNegotiationHistory ? "Thu gọn" : "Mở rộng"}
                      </button>
                    </div>

                    {negotiations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-base-200 bg-base-100/70 p-5 text-sm text-base-content/70 transition-all">
                        Hiện chưa có đề xuất nào được ghi nhận. Hãy gửi đề xuất
                        đầu tiên để bắt đầu thương lượng.
                      </div>
                    ) : (
                      <div
                        id={negotiationHistoryPanelId}
                        role="region"
                        aria-hidden={!showNegotiationHistory}
                        className={`space-y-3 pr-1 transition-all ${
                          showNegotiationHistory
                            ? "max-h-[480px] overflow-y-auto"
                            : "pointer-events-none max-h-0 overflow-hidden opacity-0"
                        }`}
                      >
                        {negotiations.map((negotiation) => {
                          const statusMeta = getNegotiationStatusMeta(
                            negotiation.status,
                          );
                          const isPending =
                            negotiation.status ===
                            DisputeNegotiationStatus.PENDING;

                          const proposerUser =
                            negotiation.proposer ??
                            (negotiation.proposerId
                              ? ({
                                  id: negotiation.proposerId,
                                  profile: (negotiation.proposer as any)?.profile ?? null,
                                  firstName: (negotiation.proposer as any)?.firstName,
                                  lastName: (negotiation.proposer as any)?.lastName,
                                } as DisputeNegotiation["proposer"])
                              : null);
                          const proposerLabel = getPartyLabel(proposerUser, {
                            candidateId:
                              proposerUser?.id ?? negotiation.proposerId ?? null,
                            clientId: contractClientId,
                            freelancerId: contractFreelancerId,
                            currentUserId,
                          });

                          return (
                            <div
                              key={negotiation.id}
                              className="space-y-3 rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/80 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-base-content">
                                    {proposerLabel ?? "Người dùng"}
                                  </p>
                                  <p className="text-xs text-base-content/60">
                                    {formatDateTime(negotiation.createdAt) ??
                                      "Không rõ thời gian"}
                                  </p>
                                </div>
                                <span className={`badge ${statusMeta.badge}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                              <div className="grid gap-3 rounded-xl border border-base-200/80 bg-base-100/90 p-4 text-xs text-base-content/70 md:grid-cols-2">
                                <div className="space-y-1">
                                  <p className="text-xs uppercase text-base-content/60">
                                    Trả cho freelancer
                                  </p>
                                  <p className="text-sm font-semibold text-base-content">
                                    {formatCurrency(
                                      parseAmount(negotiation.releaseAmount),
                                      currency,
                                    ) ?? "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs uppercase text-base-content/60">
                                    Hoàn cho client
                                  </p>
                                  <p className="text-sm font-semibold text-base-content">
                                    {formatCurrency(
                                      parseAmount(negotiation.refundAmount),
                                      currency,
                                    ) ?? "—"}
                                  </p>
                                </div>
                              </div>
                              {negotiation.message && (
                                <div className="rounded-xl border border-base-200/60 bg-base-100/90 p-4 text-sm text-base-content/80">
                                  {negotiation.message}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-base-content/60">
                                <div>
                                  {negotiation.updatedAt
                                    ? `Cập nhật ${formatDateTime(negotiation.updatedAt)}`
                                    : "Chưa cập nhật"}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {(() => {
                                    // Check if current user is the counterparty (receiver of the negotiation)
                                    const isCounterparty = negotiation.counterparty?.id === currentUserId;
                                    const isProposer = negotiation.proposer?.id === currentUserId;
                                    
                                    // Only counterparty can respond to negotiation
                                    if (isPending && isCounterparty) {
                                      return (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs text-success"
                                          onClick={() =>
                                            requestAction(negotiation, "accept")
                                          }
                                          disabled={
                                            respondNegotiationMutation.isPending
                                          }
                                        >
                                          <CircleDollarSign className="mr-1 size-4" />{" "}
                                          Chấp nhận
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(() => {
                                    // Check if current user is the counterparty (receiver of the negotiation)
                                    const isCounterparty = negotiation.counterparty?.id === currentUserId;
                                    
                                    // Only counterparty can respond to negotiation
                                    if (isPending && isCounterparty) {
                                      return (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs text-error"
                                          onClick={() =>
                                            requestAction(negotiation, "reject")
                                          }
                                          disabled={
                                            respondNegotiationMutation.isPending
                                          }
                                        >
                                          <ShieldAlert className="mr-1 size-4" />{" "}
                                          Từ chối
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {(() => {
                                    // Only proposer can edit their own negotiation
                                    const isProposer = negotiation.proposer?.id === currentUserId;
                                    
                                    if (isPending && isProposer) {
                                      return (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs"
                                          onClick={() =>
                                            requestAction(negotiation, "edit")
                                          }
                                          disabled={
                                            updateNegotiationMutation.isPending
                                          }
                                        >
                                          <Pencil className="mr-1 size-4" /> Chỉnh
                                          sửa
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {isPending &&
                                    (negotiation.proposedBy as any)?.id ===
                                      currentUserId && (
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs text-warning"
                                        onClick={() =>
                                          requestAction(negotiation, "withdraw")
                                        }
                                        disabled={
                                          updateNegotiationMutation.isPending
                                        }
                                      >
                                        <Undo2 className="mr-1 size-4" /> Rút
                                        lại
                                      </button>
                                    )}
                                  {(() => {
                                    // Only proposer can delete their own negotiation
                                    const isProposer = negotiation.proposer?.id === currentUserId;
                                    
                                    if (isPending && isProposer) {
                                      return (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs text-error"
                                          onClick={() =>
                                            requestAction(negotiation, "delete")
                                          }
                                          disabled={
                                            deleteNegotiationMutation.isPending
                                          }
                                        >
                                          <Trash2 className="mr-1 size-4" /> Xóa
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-6">
              {shouldBlockOpeningDispute ? (
                <div className="rounded-2xl border border-dashed border-base-200 bg-base-50/80 p-6 text-sm text-base-content/80">
                  <div className="mb-3 flex items-center gap-3 text-base-content">
                    <ShieldAlert className="size-5 text-amber-500" />
                    <div>
                      <p className="text-base font-semibold text-base-content">
                        Không thể mở dispute mới
                      </p>
                      <p className="text-sm text-base-content/70">
                        {blockDisputeDescription}
                      </p>
                    </div>
                  </div>
                  {milestoneStatusLabel && (
                    <p>
                      Trạng thái hiện tại:{" "}
                      <span className="font-semibold text-base-content">
                        {milestoneStatusLabel}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-base-200 bg-base-50/80 p-6">
                  <div className="mb-4 flex items-center gap-3 text-base-content">
                    <AlertTriangle className="size-5 text-amber-500" />
                    <div>
                      <p className="text-base font-semibold">
                        Chưa có dispute cho milestone này
                      </p>
                      <p className="text-sm text-base-content/70">
                        Khi mở dispute, nền tảng sẽ khóa số tiền trong escrow và
                        mời hai bên thảo luận để tìm giải pháp.
                      </p>
                    </div>
                  </div>
                  <form
                    onSubmit={handleOpenDisputeSubmit((values) =>
                      openDisputeMutation.mutate(values),
                    )}
                    className="space-y-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content">
                          Trả cho freelancer
                          <span className="font-normal text-base-content/60">
                            {" "}
                            ({currency})
                          </span>
                        </label>
                        <Controller
                          name="proposedRelease"
                          control={openDisputeControl}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              value={field.value ?? 0}
                              onChange={(event) => {
                                const raw = event.target.value;
                                field.onChange(raw === "" ? 0 : Number(raw));
                              }}
                              className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                              disabled={openDisputeMutation.isPending}
                            />
                          )}
                        />
                        {openDisputeErrors.proposedRelease && (
                          <p className="text-xs text-error">
                            {openDisputeErrors.proposedRelease.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content">
                          Hoàn lại cho client
                          <span className="font-normal text-base-content/60">
                            {" "}
                            ({currency})
                          </span>
                        </label>
                        <Controller
                          name="proposedRefund"
                          control={openDisputeControl}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              value={field.value ?? 0}
                              onChange={(event) => {
                                const raw = event.target.value;
                                field.onChange(raw === "" ? 0 : Number(raw));
                              }}
                              className="input input-bordered w-full rounded-2xl border-base-300 bg-base-100"
                              disabled={openDisputeMutation.isPending}
                            />
                          )}
                        />
                        {openDisputeErrors.proposedRefund && (
                          <p className="text-xs text-error">
                            {openDisputeErrors.proposedRefund.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content">
                          Lý do mở dispute
                        </label>
                        <Controller
                          name="reason"
                          control={openDisputeControl}
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={4}
                              value={field.value ?? ""}
                              className="textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100"
                              placeholder="Mô tả vấn đề bạn gặp phải và điều bạn mong muốn."
                              disabled={openDisputeMutation.isPending}
                            />
                          )}
                        />
                        {openDisputeErrors.reason && (
                          <p className="text-xs text-error">
                            {openDisputeErrors.reason.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content">
                          Ghi chú nội bộ
                        </label>
                        <Controller
                          name="note"
                          control={openDisputeControl}
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={4}
                              value={field.value ?? ""}
                              className="textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100"
                              placeholder="Thông tin này chỉ hiển thị với bộ phận hỗ trợ."
                              disabled={openDisputeMutation.isPending}
                            />
                          )}
                        />
                        {openDisputeErrors.note && (
                          <p className="text-xs text-error">
                            {openDisputeErrors.note.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={openDisputeMutation.isPending}
                      >
                        {openDisputeMutation.isPending
                          ? "Đang mở dispute…"
                          : "Mở dispute"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === "evidence" && dispute?.id && (
            <div className="space-y-6">
              {console.log('Rendering Evidence Tab', {
                activeTab,
                disputeId: dispute?.id,
                userRole: currentUser?.role,
                shouldShowEvidenceTab
              })}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-800">
                  {currentUser?.role === 'ADMIN' ? 'Giao diện Admin - Hòa giải nội bộ' : 'Bằng chứng hòa giải'}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {currentUser?.role === 'ADMIN' 
                    ? 'Xem bằng chứng từ cả hai bên và tạo đề xuất hòa giải.'
                    : 'Nộp bằng chứng và xem đề xuất hòa giải từ admin.'
                  }
                </p>
              </div>
              
              <MediationEvidenceSection
                disputeId={dispute.id}
                userRole={
                  currentUser?.role === 'ADMIN' 
                    ? 'ADMIN' 
                    : isClientParty 
                    ? 'CLIENT' 
                    : 'FREELANCER'
                }
                userId={currentUserId || ''}
                escrowAmount={
                  contractSummary?.escrowAmount ?? 
                  (contractEntity?.milestones as any)?.find((m: any) => m.id === milestoneId)?.amount ?? 
                  0
                }
                currency={
                  (contractSummary?.currency ?? 
                  contractEntity?.currency ?? 
                  'USD') as string
                }
              />
            </div>
          )}
        </div>
      </div>
      {actionState.negotiation && actionState.action === "accept" && (
        <ConfirmActionModal
          title="Chấp nhận đề xuất này?"
          description="Bạn đồng ý với cách chia khoản tiền trong escrow. Hệ thống sẽ cập nhật trạng thái dispute."
          confirmLabel="Chấp nhận"
          onConfirm={handleAcceptNegotiation}
          onClose={closeActionDialog}
          isSubmitting={respondNegotiationMutation.isPending}
        />
      )}

      {actionState.negotiation && actionState.action === "withdraw" && (
        <ConfirmActionModal
          title="Rút lại đề xuất?"
          description="Đề xuất này sẽ được đánh dấu là đã rút lại. Bên còn lại sẽ thấy thông báo thay đổi."
          confirmLabel="Rút lại"
          confirmTone="danger"
          onConfirm={handleWithdrawNegotiation}
          onClose={closeActionDialog}
          isSubmitting={updateNegotiationMutation.isPending}
        />
      )}

      {actionState.negotiation && actionState.action === "delete" && (
        <ConfirmActionModal
          title="Xóa đề xuất khỏi dispute?"
          description="Hành động này không thể hoàn tác và đề xuất sẽ biến mất khỏi lịch sử."
          confirmLabel="Xóa đề xuất"
          confirmTone="danger"
          onConfirm={handleDeleteNegotiation}
          onClose={closeActionDialog}
          isSubmitting={deleteNegotiationMutation.isPending}
        />
      )}

      {actionState.negotiation && actionState.action === "reject" && (
        <RejectNegotiationModal
          isSubmitting={respondNegotiationMutation.isPending}
          onSubmit={(values) => handleRejectNegotiation(values)}
          onClose={closeActionDialog}
        />
      )}

      {actionState.negotiation && actionState.action === "edit" && (
        <EditNegotiationModal
          negotiation={actionState.negotiation}
          currency={currency}
          isSubmitting={updateNegotiationMutation.isPending}
          onSubmit={(values) => handleEditNegotiation(values)}
          onClose={closeActionDialog}
        />
      )}
    </div>
  );
};

export default ContractDisputeRoomPage;
