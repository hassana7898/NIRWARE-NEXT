import { UserRole } from '@nirware/config';
import { NotFoundError, ForbiddenError } from '@nirware/shared';
import { AuthorizationPolicy } from '@nirware/domain';
import { query, queryOne } from '../db/connection.js';
import { AuthenticatedUser } from '../middleware/auth.js';
import { AuditService } from './audit.service.js';

export class FarmerService {
  // --- Farmers ---
  public static async listFarmers(actor: AuthenticatedUser) {
    if (actor.role === UserRole.FARMER) {
      if (!actor.farmerId) return [];
      return await query(
        `SELECT f.*,
                (SELECT COUNT(*) FROM farms WHERE farmer_id = f.id)::int as "farmsCount"
         FROM farmers f
         WHERE f.id = $1`,
        [actor.farmerId]
      );
    }
    return await query(
      `SELECT f.*,
              (SELECT COUNT(*) FROM farms WHERE farmer_id = f.id)::int as "farmsCount"
       FROM farmers f
       ORDER BY f.created_at DESC`
    );
  }

  public static async getFarmerById(id: string, actor: AuthenticatedUser) {
    AuthorizationPolicy.assertCanAccessFarmer(actor, id);
    const farmer = await queryOne(
      `SELECT f.*,
              (SELECT COUNT(*) FROM farms WHERE farmer_id = f.id)::int as "farmsCount"
       FROM farmers f
       WHERE f.id = $1`,
      [id]
    );
    if (!farmer) throw new NotFoundError('مرغدار', id);
    return farmer;
  }

  public static async createFarmer(
    data: {
      userId?: string;
      fullName: string;
      businessName: string;
      nationalId: string;
      mobile: string;
      address: string;
      contactPerson?: string;
    },
    actor: AuthenticatedUser
  ) {
    const farmer = await queryOne(
      `INSERT INTO farmers (user_id, full_name, business_name, national_id, mobile, address, contact_person)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId || null,
        data.fullName,
        data.businessName,
        data.nationalId,
        data.mobile,
        data.address,
        data.contactPerson || null,
      ]
    );

    await AuditService.log({
      userId: actor.id,
      action: 'CREATE',
      entityType: 'Farmer',
      entityId: farmer.id,
      details: data,
    });

    return farmer;
  }

  // --- Farms ---
  public static async listFarms(actor: AuthenticatedUser, farmerId?: string) {
    let sql = `
      SELECT fm.*, f.full_name as "farmerName",
             (SELECT COUNT(*) FROM poultry_houses WHERE farm_id = fm.id)::int as "housesCount"
      FROM farms fm
      JOIN farmers f ON f.id = fm.farmer_id
    `;
    const params: any[] = [];

    if (actor.role === UserRole.FARMER) {
      sql += ' WHERE fm.farmer_id = $1';
      params.push(actor.farmerId);
    } else if (farmerId) {
      sql += ' WHERE fm.farmer_id = $1';
      params.push(farmerId);
    }

    sql += ' ORDER BY fm.created_at DESC';
    return await query(sql, params);
  }

  public static async createFarm(
    data: {
      farmerId: string;
      name: string;
      licenseNumber: string;
      location: string;
      totalCapacity: number;
      address: string;
    },
    actor: AuthenticatedUser
  ) {
    AuthorizationPolicy.assertCanAccessFarmer(actor, data.farmerId);
    const farm = await queryOne(
      `INSERT INTO farms (farmer_id, name, license_number, location, total_capacity, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.farmerId, data.name, data.licenseNumber, data.location, data.totalCapacity, data.address]
    );
    return farm;
  }

  // --- Poultry Houses ---
  public static async listHouses(actor: AuthenticatedUser, farmId: string) {
    return await query(
      `SELECT h.*, f.name as "farmName"
       FROM poultry_houses h
       JOIN farms f ON f.id = h.farm_id
       WHERE h.farm_id = $1
       ORDER BY h.created_at ASC`,
      [farmId]
    );
  }

  public static async createHouse(
    data: {
      farmId: string;
      code: string;
      capacity: number;
      houseType: string;
    },
    actor: AuthenticatedUser
  ) {
    const house = await queryOne(
      `INSERT INTO poultry_houses (farm_id, code, capacity, house_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.farmId, data.code, data.capacity, data.houseType]
    );
    return house;
  }

  // --- Flocks ---
  public static async listFlocks(actor: AuthenticatedUser, houseId?: string) {
    let sql = `
      SELECT fl.*, h.code as "houseCode", fm.name as "farmName", f.full_name as "farmerName", f.id as "farmerId"
      FROM flocks fl
      JOIN poultry_houses h ON h.id = fl.poultry_house_id
      JOIN farms fm ON fm.id = h.farm_id
      JOIN farmers f ON f.id = fm.farmer_id
    `;
    const params: any[] = [];

    if (actor.role === UserRole.FARMER) {
      sql += ' WHERE f.id = $1';
      params.push(actor.farmerId);
      if (houseId) {
        sql += ' AND fl.poultry_house_id = $2';
        params.push(houseId);
      }
    } else if (houseId) {
      sql += ' WHERE fl.poultry_house_id = $1';
      params.push(houseId);
    }

    sql += ' ORDER BY fl.start_date DESC';
    return await query(sql, params);
  }

  public static async createFlock(
    data: {
      poultryHouseId: string;
      flockCode: string;
      breed: string;
      chickCount: number;
      initialWeightGrams: number;
      startDate: string;
      status?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    const flock = await queryOne(
      `INSERT INTO flocks (poultry_house_id, flock_code, breed, chick_count, initial_weight_grams, start_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.poultryHouseId,
        data.flockCode,
        data.breed,
        data.chickCount,
        data.initialWeightGrams || 42,
        data.startDate,
        data.status || 'ACTIVE',
        data.notes || null,
      ]
    );
    return flock;
  }

  // --- Daily Records ---
  public static async listDailyRecords(flockId: string) {
    return await query(
      `SELECT * FROM daily_flock_records WHERE flock_id = $1 ORDER BY record_date DESC`,
      [flockId]
    );
  }

  public static async createDailyRecord(
    data: {
      flockId: string;
      recordDate: string;
      birdCount: number;
      mortalityCount: number;
      feedConsumptionKg: number;
      avgWeightGrams: number;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    const record = await queryOne(
      `INSERT INTO daily_flock_records (flock_id, record_date, bird_count, mortality_count, feed_consumption_kg, avg_weight_grams, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (flock_id, record_date) DO UPDATE
       SET bird_count = EXCLUDED.bird_count,
           mortality_count = EXCLUDED.mortality_count,
           feed_consumption_kg = EXCLUDED.feed_consumption_kg,
           avg_weight_grams = EXCLUDED.avg_weight_grams,
           notes = EXCLUDED.notes
       RETURNING *`,
      [
        data.flockId,
        data.recordDate,
        data.birdCount,
        data.mortalityCount || 0,
        data.feedConsumptionKg,
        data.avgWeightGrams || 0,
        data.notes || null,
      ]
    );

    // Update flock cumulative stats
    await query(
      `UPDATE flocks
       SET feed_consumed_kg = (SELECT COALESCE(SUM(feed_consumption_kg), 0) FROM daily_flock_records WHERE flock_id = $1),
           mortality_count = (SELECT COALESCE(SUM(mortality_count), 0) FROM daily_flock_records WHERE flock_id = $1),
           final_weight_grams = $2
       WHERE id = $1`,
      [data.flockId, data.avgWeightGrams || 0]
    );

    return record;
  }

  // --- Feed Quotas ---
  public static async listQuotas(actor: AuthenticatedUser) {
    let sql = `
      SELECT q.*, f.full_name as "farmerName", fl.flock_code as "flockCode",
             (q.approved_quantity_kg - q.used_quantity_kg) as "remainingQuantityKg"
      FROM feed_quotas q
      JOIN farmers f ON f.id = q.farmer_id
      JOIN flocks fl ON fl.id = q.flock_id
    `;
    const params: any[] = [];

    if (actor.role === UserRole.FARMER) {
      sql += ' WHERE q.farmer_id = $1';
      params.push(actor.farmerId);
    }

    sql += ' ORDER BY q.created_at DESC';
    return await query(sql, params);
  }

  public static async createQuota(
    data: {
      farmerId: string;
      flockId: string;
      periodStart: string;
      periodEnd: string;
      approvedQuantityKg: number;
      status?: string;
      notes?: string;
    },
    actor: AuthenticatedUser
  ) {
    const quota = await queryOne(
      `INSERT INTO feed_quotas (farmer_id, flock_id, period_start, period_end, approved_quantity_kg, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.farmerId,
        data.flockId,
        data.periodStart,
        data.periodEnd,
        data.approvedQuantityKg,
        data.status || 'ACTIVE',
        data.notes || null,
      ]
    );
    return quota;
  }
}
