import { queryOne, query } from '../db/connection.js';
import { AuditService } from './audit.service.js';

export interface CompanySettings {
  id: string;
  companyName: string;
  legalName: string;
  registrationNumber: string;
  nationalId: string;
  phone: string;
  email: string;
  factoryAddress: string;
  officeAddress: string;
  logoUrl: string;
  signatoryManagerTitle: string;
  signatoryManagerName: string;
  signatoryScaleTitle: string;
  signatoryScaleName: string;
  signatoryDriverTitle: string;
  signatoryFarmerTitle: string;
  updatedAt: string;
}

export class SettingsService {
  public static async getSettings(): Promise<CompanySettings> {
    const row = await queryOne<any>(
      `SELECT id,
              company_name as "companyName",
              legal_name as "legalName",
              registration_number as "registrationNumber",
              national_id as "nationalId",
              phone,
              email,
              factory_address as "factoryAddress",
              office_address as "officeAddress",
              logo_url as "logoUrl",
              signatory_manager_title as "signatoryManagerTitle",
              signatory_manager_name as "signatoryManagerName",
              signatory_scale_title as "signatoryScaleTitle",
              signatory_scale_name as "signatoryScaleName",
              signatory_driver_title as "signatoryDriverTitle",
              signatory_farmer_title as "signatoryFarmerTitle",
              updated_at as "updatedAt"
       FROM company_settings
       WHERE id = 'default'`
    );

    if (!row) {
      // Default fallback
      return {
        id: 'default',
        companyName: 'شرکت تولید خوراک طیور نیروار گلستان',
        legalName: 'صنایع خوراک دام و طیور نیروار (سهامی خاص)',
        registrationNumber: '۱۴۲۸۵',
        nationalId: '۱۰۱۰۰۵۴۸۹۲۱',
        phone: '۰۱۷-۳۲۴۵۰۰۰۰',
        email: 'info@nirware.ir',
        factoryAddress: 'استان گلستان، کیلومتر ۵ جاده گرگان به آق‌قلا، شهرک صنعتی، فاز ۲',
        officeAddress: 'گرگان، میدان شهدا، برج فناوری، طبقه ۴',
        logoUrl: '/logo.svg',
        signatoryManagerTitle: 'مدیر فنی و کارخانه',
        signatoryManagerName: 'مهندس احسان حسینی',
        signatoryScaleTitle: 'متصدی باسکول و کنترل کیفی',
        signatoryScaleName: 'محمدرضا سمیعی',
        signatoryDriverTitle: 'راننده ناوگان ترابری',
        signatoryFarmerTitle: 'مرغدار تحویل‌گیرنده نهاده',
        updatedAt: new Date().toISOString(),
      };
    }

    return row;
  }

  public static async updateSettings(
    data: Partial<CompanySettings>,
    actor: { id: string; fullName: string }
  ): Promise<CompanySettings> {
    await query(
      `UPDATE company_settings
       SET company_name = COALESCE($1, company_name),
           legal_name = COALESCE($2, legal_name),
           registration_number = COALESCE($3, registration_number),
           national_id = COALESCE($4, national_id),
           phone = COALESCE($5, phone),
           email = COALESCE($6, email),
           factory_address = COALESCE($7, factory_address),
           office_address = COALESCE($8, office_address),
           signatory_manager_title = COALESCE($9, signatory_manager_title),
           signatory_manager_name = COALESCE($10, signatory_manager_name),
           signatory_scale_title = COALESCE($11, signatory_scale_title),
           signatory_scale_name = COALESCE($12, signatory_scale_name),
           signatory_driver_title = COALESCE($13, signatory_driver_title),
           signatory_farmer_title = COALESCE($14, signatory_farmer_title),
           updated_at = NOW()
       WHERE id = 'default'`,
      [
        data.companyName,
        data.legalName,
        data.registrationNumber,
        data.nationalId,
        data.phone,
        data.email,
        data.factoryAddress,
        data.officeAddress,
        data.signatoryManagerTitle,
        data.signatoryManagerName,
        data.signatoryScaleTitle,
        data.signatoryScaleName,
        data.signatoryDriverTitle,
        data.signatoryFarmerTitle,
      ]
    );

    await AuditService.log({
      userId: actor.id,
      action: 'UPDATE_SETTINGS',
      entityType: 'CompanySettings',
      entityId: 'default',
      details: data,
    });

    return await this.getSettings();
  }
}
