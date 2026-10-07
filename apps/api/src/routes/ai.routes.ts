import { Router } from 'express';
import multer from 'multer';
import { createSuccessResponse } from '@nirware/shared';
import { aiAssistantQuerySchema } from '@nirware/validation';
import { AiService } from '../services/ai.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const aiRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

aiRouter.use(authMiddleware);

aiRouter.post('/assistant', async (req, res, next) => {
  try {
    const data = aiAssistantQuerySchema.parse(req.body);
    const result = await AiService.executeAssistantQuery(data.prompt, req.user!);
    res.json(createSuccessResponse(result, req.requestId));
  } catch (err) {
    next(err);
  }
});

aiRouter.get('/ocr-status', (req, res) => {
  const status = AiService.getOcrProviderStatus();
  res.json(createSuccessResponse(status, req.requestId));
});

aiRouter.post('/ocr-bill', upload.single('billImage'), async (req, res, next) => {
  try {
    const result = await AiService.processBillOcr({
      originalname: req.file?.originalname || 'bill.jpg',
      buffer: req.file?.buffer,
    });
    res.json(createSuccessResponse(result, req.requestId));
  } catch (err) {
    next(err);
  }
});
