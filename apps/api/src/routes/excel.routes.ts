import { Router } from 'express';
import multer from 'multer';
import { createSuccessResponse, ValidationError } from '@nirware/shared';
import { ExcelService } from '../services/excel.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const excelRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

excelRouter.use(authMiddleware);

excelRouter.get('/export/:entity', async (req, res, next) => {
  try {
    const entity = req.params.entity as 'products' | 'orders' | 'inventory' | 'flocks';
    if (!['products', 'orders', 'inventory', 'flocks'].includes(entity)) {
      throw new ValidationError('موجودیت درخواستی برای خروجی اکسل معتبر نیست');
    }

    const buffer = await ExcelService.exportEntity(entity);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=nirware-${entity}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

excelRouter.post('/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ValidationError('فایل اکسل آپلود نشده است');
    }
    const preview = ExcelService.previewProductImport(req.file.buffer);
    res.json(createSuccessResponse(preview, req.requestId));
  } catch (err) {
    next(err);
  }
});
