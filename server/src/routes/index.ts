import { Router } from 'express';
import { transactionsRouter } from './transactions.js';
import { remindersRouter } from './reminders.js';
import { consumptionRouter } from './consumption.js';
import { personaRouter } from './persona.js';
import { planRouter } from './plan.js';
import { nlpRouter } from './nlp.js';
import { auditRouter } from './audit.js';
import { ocrRouter } from './ocr.js';
import { productsRouter } from './products.js';
import { flowsRouter } from './flows.js';
import { incentivesRouter } from './incentives.js';
import { accountsRouter } from './accounts.js';
import { riskRouter } from './risk.js';
import { reportsRouter } from './reports.js';
import { plansRouter } from './plans.js';
import { aiRouter } from './ai.js';
import { analysisRouter } from './analysis.js';
import { familyRouter } from './family.js';

export const router = Router();

router.use('/transactions', transactionsRouter);
router.use('/reminders', remindersRouter);
router.use('/consumption', consumptionRouter);
router.use('/user', personaRouter);
router.use('/plan', planRouter);
router.use('/plans', plansRouter);
router.use('/', nlpRouter);
router.use('/', auditRouter);
router.use('/', ocrRouter);
router.use('/', productsRouter);
router.use('/', flowsRouter);
router.use('/', incentivesRouter);
router.use('/', accountsRouter);
router.use('/', riskRouter);
router.use('/', reportsRouter);
router.use('/', aiRouter);
router.use('/', analysisRouter);
router.use('/', familyRouter);

// legacy: removed /audit/logs in favor of /audit/batch
