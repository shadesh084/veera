import { Router } from 'express';
import {
  getDashboardAnalytics,
  getProgressAnalytics,
} from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getDashboardAnalytics);
router.get('/progress', getProgressAnalytics);

export default router;
