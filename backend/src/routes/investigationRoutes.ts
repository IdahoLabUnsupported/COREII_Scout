// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router } from 'express';
import { createInvestigation, getInvestigations, getInvestigation, bulkGetInvestigations, updateInvestigation,
    deleteInvestigation, addInvestigationSource, updateEntity, newStixVersion, getTrimmedStix, 
    updateHighlightRange, deleteHighlightRange, updateComments, updateCurrentStixVersionId } from '../handlers/investigationHandler';

const router = Router();

router.post('/investigations', createInvestigation);
router.get('/investigations', getInvestigations);
router.get('/investigations/:derivedSourceId', getInvestigation);
router.delete('/investigations/:id', deleteInvestigation);
router.put('/investigations/:id', updateInvestigation);
router.put('/investigations/addsource/:investigationId/:sourceId', addInvestigationSource);
router.put('/investigations/updateEntity/:resultId', updateEntity);

router.put('/investigations/newstixversion/:derivedSourceId', newStixVersion);
router.post('/investigations/getbulkresults', bulkGetInvestigations);
router.post('/investigations/updatecurrentstixversionid/:id', updateCurrentStixVersionId);
router.get('/investigations/trimmedstix/:derivedSourceId', getTrimmedStix);

router.put('/investigations/updateHighlightRange/:derivedFromSourceId', updateHighlightRange);
router.delete('/investigations/deleteHighlightRange/:derivedFromSourceId', deleteHighlightRange); 

router.put('/investigations/updatecomments/:derivedFromSourceId', updateComments);
export default router;
