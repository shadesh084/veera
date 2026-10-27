import { Router } from 'express';
import {
  getStudyPlans,
  getStudyPlanById,
  createStudyPlan,
  updateStudyPlan,
  toggleTask,
  deleteStudyPlan,
} from '../controllers/studyPlanController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createStudyPlanSchema, updateStudyPlanSchema } from '../schemas/studyPlanSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', getStudyPlans);
router.post('/', validate(createStudyPlanSchema), createStudyPlan);
router.get('/:id', getStudyPlanById);
router.put('/:id', validate(updateStudyPlanSchema), updateStudyPlan);
router.patch('/:id/tasks/:taskId/toggle', toggleTask);
router.delete('/:id', deleteStudyPlan);

export default router;
