import { Router } from 'express';
import { ReceiptController } from '../controllers/receipt.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new ReceiptController();

router.get('/', authenticate, authorizeCompany, controller.listReceipts);
router.get('/:id', authenticate, authorizeCompany, controller.getReceiptById);
router.post('/', authenticate, authorizeCompany, controller.createReceipt);
router.put('/:id', authenticate, authorizeCompany, controller.updateReceipt);
router.delete('/:id', authenticate, authorizeCompany, controller.cancelReceipt);
router.get('/:id/pdf', authenticate, authorizeCompany, controller.downloadPdf);

export default router;
