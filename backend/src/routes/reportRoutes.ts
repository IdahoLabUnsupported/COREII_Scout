// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router } from 'express';
import passport from '../auth/passport';
import { createReport, getReports, getReport, updateReport, deleteReport, 
    addSourceToReport, newGeneratedReportTextVersionApi, updateCurrentTextVersionId, getArticlesAndStixApi,
    newGeneratedReportTextVersion, saveVersion, getVersionRecords, getCurrentReportText, updateComments,
    getComments, getStixView, callLlmForReportSummary, getAceReport, createReportByUser, getReportsForUser,
    updateReportSettings, updateReportPrompts, getJobStatus, updateJobStatus, killJob
} from '../handlers/reportHandler';

const router = Router();

router.post('/reports', createReport);
router.get('/reports', getReports);
router.get('/reports/:id', getReport);
router.patch('/reports/:id', (req, res, next) => {
    console.log(`Received request to update report with ID: ${req.params.id}`);
    next();
}, updateReport);

router.delete('/reports/:id', deleteReport);
router.put('/reports/:reportId/sources/:sourceId', addSourceToReport);
router.put('/reports/newgenreporttextversion/:id', newGeneratedReportTextVersionApi);
router.post('/reports/updatecurrenttextversionid/:id', updateCurrentTextVersionId);
router.get('reports/getarticlesandstix/:id', getArticlesAndStixApi);
router.put('/reports/newgenreporttextversion/:id', newGeneratedReportTextVersion);
router.put('/reports/comments/:id', updateComments);
router.get('/reports/comments/:id', getComments);
router.post('/reports/saveversion/:id', saveVersion);
router.get('/reports/saveversion/:id', getVersionRecords);
router.get('/reports/reporttext/:id', getCurrentReportText);
router.get('/reports/getstixview/:id', getStixView);
router.get('/reports/callllm/:id', callLlmForReportSummary);
router.get('/reports/ace/:id', getAceReport);
router.put('/reports/settings/:id', updateReportSettings);
router.put('/reports/prompts/:id', updateReportPrompts);
router.get('/reports/job-status/:id', getJobStatus);
router.put('/reports/job-status/:id', updateJobStatus);
router.post('/reports/kill-job/:id', killJob);

// authenticated routes
router.post('/auth/reports', passport.authenticate('jwt', { session: false }), createReportByUser);
router.get('/auth/reports', passport.authenticate('jwt', { session: false }), getReportsForUser);

export default router;
