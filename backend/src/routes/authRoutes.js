import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../schemas/profileSchemas.js';

const router = Router();

router.use(requireAuth);

router.get('/me', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);

export default router;
