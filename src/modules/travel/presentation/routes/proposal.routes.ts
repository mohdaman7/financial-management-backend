import { Router } from 'express';
import { ProposalController } from '../controllers/proposal.controller';
import { authenticate, authorizeCompany } from '@shared/middleware/auth.middleware';

const router = Router();
const controller = new ProposalController();

router.get('/', authenticate, authorizeCompany, controller.listProposals);
router.get('/:id', authenticate, authorizeCompany, controller.getProposalById);
router.post('/', authenticate, authorizeCompany, controller.createProposal);
router.put('/:id', authenticate, authorizeCompany, controller.updateProposal);
router.delete('/:id', authenticate, authorizeCompany, controller.deleteProposal);

router.post('/:id/send-email', authenticate, authorizeCompany, controller.sendEmail);
router.get('/:id/pdf', authenticate, authorizeCompany, controller.downloadPdf);
router.post('/:id/convert-to-invoice', authenticate, authorizeCompany, controller.convertToInvoice);

export default router;
