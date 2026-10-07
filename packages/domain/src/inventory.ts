/**
 * Ledger-Based Inventory Domain Logic
 * Enforces immutable append-only ledger rules:
 * Opening + Inbound + Production_In - Outbound - Consumption_Out + Adjustment = Balance
 */

import { InventoryTransactionType } from '@nirware/config';
import { ValidationError } from '@nirware/shared';

export interface LedgerEntry {
  id: string;
  productId: string;
  transactionType: InventoryTransactionType;
  quantityDeltaKg: number;
  runningBalanceKg: number;
  referenceType: string;
  referenceId: string;
  notes?: string;
  createdAt: Date | string;
}

export class InventoryLedgerDomain {
  /**
   * Computes the new balance given current balance and transaction type + quantity
   */
  public static calculateNextBalance(
    currentBalanceKg: number,
    transactionType: InventoryTransactionType,
    quantityKg: number
  ): { deltaKg: number; newBalanceKg: number } {
    if (quantityKg <= 0 && transactionType !== InventoryTransactionType.ADJUSTMENT) {
      throw new ValidationError('مقدار تراکنش انبار باید عددی مثبت باشد');
    }

    let deltaKg = 0;

    switch (transactionType) {
      case InventoryTransactionType.OPENING:
      case InventoryTransactionType.INBOUND:
      case InventoryTransactionType.PRODUCTION_IN:
        deltaKg = Math.abs(quantityKg);
        break;

      case InventoryTransactionType.OUTBOUND:
      case InventoryTransactionType.CONSUMPTION_OUT:
        deltaKg = -Math.abs(quantityKg);
        break;

      case InventoryTransactionType.ADJUSTMENT:
        // Can be positive or negative
        deltaKg = quantityKg;
        break;

      case InventoryTransactionType.REVERSAL:
        // Reversal delta is the exact inverse of previous
        deltaKg = quantityKg;
        break;

      default:
        throw new ValidationError(`نوع تراکنش انبار نامعتبر است: ${transactionType}`);
    }

    const newBalanceKg = Math.round((currentBalanceKg + deltaKg) * 100) / 100;

    if (newBalanceKg < 0) {
      throw new ValidationError(
        `موجودی انبار پس از تراکنش نمی‌تواند منفی شود (موجودی فعلی: ${currentBalanceKg}، کسر درخواستی: ${Math.abs(
          deltaKg
        )})`
      );
    }

    return { deltaKg, newBalanceKg };
  }

  /**
   * Generates a pair of reversal and correction entries for an incorrect ledger entry
   */
  public static createReversalEntry(
    originalEntry: LedgerEntry,
    currentBalanceKg: number,
    reversalReason: string
  ): {
    reversalDeltaKg: number;
    newBalanceKg: number;
    notes: string;
  } {
    const reversalDeltaKg = -originalEntry.quantityDeltaKg;
    const newBalanceKg = Math.round((currentBalanceKg + reversalDeltaKg) * 100) / 100;

    if (newBalanceKg < 0) {
      throw new ValidationError(
        'برگشت تراکنش منجر به موجودی منفی انبار می‌شود و امکان‌پذیر نیست'
      );
    }

    return {
      reversalDeltaKg,
      newBalanceKg,
      notes: `برگشت تراکنش شناسه ${originalEntry.id}: ${reversalReason}`,
    };
  }
}
