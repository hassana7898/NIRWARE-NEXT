/**
 * Feed Quota Domain Rules and Calculations
 */

import { QuotaStatus } from '@nirware/config';
import { ValidationError } from '@nirware/shared';

export interface FeedQuotaRecord {
  id: string;
  farmerId: string;
  flockId: string;
  approvedQuantityKg: number;
  usedQuantityKg: number;
  status: QuotaStatus;
  periodStart: Date | string;
  periodEnd: Date | string;
}

export class QuotaCalculator {
  /**
   * Calculates remaining allowable quota in KG
   */
  public static calculateRemaining(quota: {
    approvedQuantityKg: number;
    usedQuantityKg: number;
  }): number {
    return Math.max(0, quota.approvedQuantityKg - quota.usedQuantityKg);
  }

  /**
   * Validates if the requested order quantity can be deducted from the quota
   */
  public static validateOrderAgainstQuota(
    quota: FeedQuotaRecord,
    requestedQuantityKg: number
  ): void {
    if (quota.status !== QuotaStatus.ACTIVE) {
      throw new ValidationError(
        `سهمیه مورد نظر فعال نمی‌باشد (وضعیت فعلی: ${quota.status})`
      );
    }

    const now = new Date();
    const start = new Date(quota.periodStart);
    const end = new Date(quota.periodEnd);

    if (now < start || now > end) {
      throw new ValidationError(
        'بازه زمانی معتبر سهمیه دان طیور منقضی شده یا هنوز آغاز نگردیده است'
      );
    }

    const remaining = this.calculateRemaining(quota);
    if (requestedQuantityKg > remaining) {
      throw new ValidationError(
        `میزان دان درخواستی (${requestedQuantityKg} کیلوگرم) از سهمیه باقیمانده (${remaining} کیلوگرم) بیشتر است`
      );
    }
  }

  /**
   * Computes updated quota status after usage
   */
  public static computeStatusAfterUsage(
    approvedQuantityKg: number,
    newUsedQuantityKg: number
  ): QuotaStatus {
    if (newUsedQuantityKg >= approvedQuantityKg) {
      return QuotaStatus.EXHAUSTED;
    }
    return QuotaStatus.ACTIVE;
  }
}
