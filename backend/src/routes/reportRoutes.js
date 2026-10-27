import { Router } from 'express';
import { getReportSummary, exportCsv } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getReportSummary);
router.get('/export-csv', exportCsv);

export default router;
