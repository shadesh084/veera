import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSubjectSchema, updateSubjectSchema } from '../schemas/subjectSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSubjects);
router.post('/', validate(createSubjectSchema), createSubject);
router.get('/:id', getSubjectById);
router.put('/:id', validate(updateSubjectSchema), updateSubject);
router.delete('/:id', deleteSubject);

export default router;
