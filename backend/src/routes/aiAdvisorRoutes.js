import { Router } from 'express';
import {
  analyzePerformance,
  generateStudyPlan,
  getAIStatus,
} from '../controllers/aiAdvisorController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { advisoryRequestSchema } from '../schemas/aiAdvisorSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/status', getAIStatus);
router.post('/analyze', validate(advisoryRequestSchema), analyzePerformance);
router.post('/study-plan', generateStudyPlan);

export default router;
