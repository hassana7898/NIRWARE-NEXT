import pkg from 'pg';
import { query } from '../db/connection.js';

export interface AuditParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
  ipAddress?: string | null;
  requestId?: string | null;
}

export class AuditService {
  /**
   * Records audit entry within an existing PostgreSQL transaction client.
   * Guarantees transactional atomicity with the business operation.
   */
  public static async logTransactional(client: pkg.PoolClient, params: AuditParams): Promise<void> {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
        params.requestId || null,
      ]
    );
  }

  /**
   * Standalone audit log for non-transactional events (like login/logout)
   */
  public static async log(params: AuditParams): Promise<void> {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
        params.requestId || null,
      ]
    );
  }
}
