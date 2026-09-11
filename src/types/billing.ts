export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type PaymentRow = {
  id: string;
  amount: number;
  copay_amount: number;
  stamp_amount: number;
  total_amount: number;
  status: PaymentStatus;
  method: string | null;
  coverage_type: "particular" | "obra_social";
  insurer_id: string | null;
  paid_at: string | null;
  created_at: string;
  patients: { first_name: string; last_name: string } | null;
};
