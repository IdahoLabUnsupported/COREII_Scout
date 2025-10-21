// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router } from 'express';
import { createOrUpdateSettings, getSettings, deleteSetting } from '../handlers/settingsHandler';

const router = Router();

router.post('/settings', createOrUpdateSettings);
router.get('/settings', getSettings);
router.delete('/settings', deleteSetting);

export default router;