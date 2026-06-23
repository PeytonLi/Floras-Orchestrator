import type { AgentInput, AgentOutput, TransferAmount } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

export class CO2FromInvoiceStubAgent extends BaseAgent {
  readonly id = "co2-from-invoice";
  readonly name = "CO2 From Invoice (Stub)";
  readonly description = "Calculates required Floras transfer amount from invoice data";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Calculating Floras transfer amount (stub)");
    await sleep(800);

    const invoice = input.context.invoice;
    if (!invoice) {
      return { success: false, data: null, error: "No invoice in context" };
    }

    let florasCount: number;
    let breakdown: string;

    if (invoice.calculationMethod === "percentage" && invoice.percentageRate) {
      const allocationEUR = invoice.totalAmountEUR * invoice.percentageRate;
      florasCount = Math.round(allocationEUR / 10);
      breakdown = `${(invoice.percentageRate * 100).toFixed(1)}% of €${invoice.totalAmountEUR.toLocaleString()} = €${allocationEUR.toLocaleString()} → ${florasCount} Floras at €10/unit`;
    } else {
      florasCount = 3500;
      breakdown = "Detailed calculation based on emission factors per line item (stub)";
    }

    const transfer: TransferAmount = {
      florasCount,
      co2Kg: florasCount,
      calculationBreakdown: breakdown,
      requiresHumanApproval: invoice.calculationMethod === "detailed",
    };

    logger.info(`Calculated ${florasCount} Floras to transfer`, { breakdown });
    return { success: true, data: { transferAmount: transfer } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
