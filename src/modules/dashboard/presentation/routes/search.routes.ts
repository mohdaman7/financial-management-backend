import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new SearchController();

router.get('/', authenticate, authorizeCompany, controller.search);

export default router;
