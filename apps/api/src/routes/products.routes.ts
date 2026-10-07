import { Router } from 'express';
import { createSuccessResponse } from '@nirware/shared';
import {
  createCategorySchema,
  createProductSchema,
  createFormulaSchema,
} from '@nirware/validation';
import { UserRole } from '@nirware/config';
import { ProductService } from '../services/product.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const productsRouter = Router();

productsRouter.use(authMiddleware);

// Categories
productsRouter.get('/categories', async (req, res, next) => {
  try {
    const list = await ProductService.listCategories();
    res.json(createSuccessResponse(list, req.requestId));
  } catch (err) {
    next(err);
  }
});

productsRouter.post(
  '/categories',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const data = createCategorySchema.parse(req.body);
      const cat = await ProductService.createCategory(data);
      res.status(201).json(createSuccessResponse(cat, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);

// Formulas (BOM)
productsRouter.get('/formulas', async (req, res, next) => {
  try {
    const formulas = await ProductService.listFormulas();
    res.json(createSuccessResponse(formulas, req.requestId));
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/formulas/:id', async (req, res, next) => {
  try {
    const formula = await ProductService.getFormulaById(req.params.id);
    res.json(createSuccessResponse(formula, req.requestId));
  } catch (err) {
    next(err);
  }
});

productsRouter.post(
  '/formulas',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCTION_OPERATOR),
  async (req, res, next) => {
    try {
      const data = createFormulaSchema.parse(req.body);
      const formula = await ProductService.createFormula(data, req.user!);
      res.status(201).json(createSuccessResponse(formula, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);

// Products
productsRouter.get('/', async (req, res, next) => {
  try {
    const type = req.query.type as string | undefined;
    const list = await ProductService.listProducts(type);
    res.json(createSuccessResponse(list, req.requestId));
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const prod = await ProductService.getProductById(req.params.id);
    res.json(createSuccessResponse(prod, req.requestId));
  } catch (err) {
    next(err);
  }
});

productsRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const data = createProductSchema.parse(req.body);
      const prod = await ProductService.createProduct(data, req.user!);
      res.status(201).json(createSuccessResponse(prod, req.requestId));
    } catch (err) {
      next(err);
    }
  }
);
