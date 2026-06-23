import type { AgentInput, AgentOutput, LedgerEvent } from "@floras/shared";
import type { Logger } from "../logger";
import { BaseAgent } from "./base-agent";

export class FlorasTransferStubAgent extends BaseAgent {
  readonly id = "floras-transfer";
  readonly name = "Floras Transfer (Stub)";
  readonly description = "Executes Floras token transfer and records ledger event";

  async execute(input: AgentInput, logger: Logger): Promise<AgentOutput> {
    logger.info("Executing Floras transfer (stub)");
    await sleep(700);

    const invoice = input.context.invoice;
    const transferAmount = input.context.transferAmount;
    if (!invoice || !transferAmount) {
      return { success: false, data: null, error: "Missing invoice or transferAmount in context" };
    }

    const ledgerEvent: LedgerEvent = {
      id: `ledger_${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromAccount: invoice.supplierName,
      toAccount: invoice.customerName,
      florasCount: transferAmount.florasCount,
      co2Kg: transferAmount.co2Kg,
      invoiceRef: invoice.invoiceNumber,
      runId: input.runId,
    };

    logger.info(
      `Transferred ${transferAmount.florasCount} Floras from ${invoice.supplierName} → ${invoice.customerName}`,
      { ledgerEvent },
    );

    return { success: true, data: { ledgerEvent } };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
