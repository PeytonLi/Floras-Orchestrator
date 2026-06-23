import type { AgentInput, AgentOutput, InvoiceData } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

export class InvoiceParserStubAgent extends BaseAgent {
  readonly id = "invoice-parser";
  readonly name = "Invoice Parser (Stub)";
  readonly description = "Parses supplier invoice to extract line items and totals";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Parsing invoice (stub)");
    await sleep(600);

    const supplierName = input.context.invoice?.supplierName
      ?? input.prompt
      ?? "Acme Supplier";

    const invoice: InvoiceData = input.context.invoice ?? {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      supplierName,
      customerName: "Floras Client Corp",
      totalAmountEUR: 48_500,
      lineItems: [
        { description: "Crude oil delivery — 500t", amountEUR: 35_000, estimatedCO2Kg: undefined },
        { description: "Transport & logistics", amountEUR: 8_500, estimatedCO2Kg: undefined },
        { description: "Refinery surcharge", amountEUR: 5_000, estimatedCO2Kg: undefined },
      ],
      calculationMethod: "percentage",
      percentageRate: 0.02,
    };

    logger.info(`Parsed invoice ${invoice.invoiceNumber}: €${invoice.totalAmountEUR.toLocaleString()} from ${invoice.supplierName}`);
    return { success: true, data: { invoice } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
