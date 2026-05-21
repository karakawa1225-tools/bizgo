import type { ExpenseItem } from "@/db/schema";
import {
  isConsumptionTaxRateKey,
  type ConsumptionTaxRateKey,
} from "@/lib/consumption-tax";

/** 過去明細コピーでフォームへ反映する項目のみ */
export type CopyLineFormPatch = {
  category: string;
  consumptionTaxRate: ConsumptionTaxRateKey;
  description: string;
  hasInvoice: boolean;
  invoiceNumber: string;
};

export function buildCopyLineFormPatch(src: ExpenseItem): CopyLineFormPatch {
  return {
    category: src.category,
    consumptionTaxRate: isConsumptionTaxRateKey(src.consumptionTaxRate)
      ? src.consumptionTaxRate
      : "0",
    description: src.description,
    hasInvoice: src.hasInvoice,
    invoiceNumber: src.invoiceNumber ?? "",
  };
}
