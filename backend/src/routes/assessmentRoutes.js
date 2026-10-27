import { Router } from 'express';
import {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} from '../controllers/assessmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  queryAssessmentSchema,
} from '../schemas/assessmentSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(queryAssessmentSchema, 'query'), getAssessments);
router.post('/', validate(createAssessmentSchema), createAssessment);
router.get('/:id', getAssessmentById);
router.put('/:id', validate(updateAssessmentSchema), updateAssessment);
router.delete('/:id', deleteAssessment);

export default router;
