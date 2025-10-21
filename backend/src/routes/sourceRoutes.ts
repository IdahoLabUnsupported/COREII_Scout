// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router } from 'express';
import { createSource, getSources, getSource, updateSource, deleteSource, updateSourceEnable,reprocessSource } from '../handlers/sourceHandler';

const multer = require('multer');
const storage = multer.memoryStorage();;
const upload = multer({ storage: storage });

const router = Router();
//router.post('/sources', createSource);
router.post('/sources', upload.single('file'), createSource); //as in req.body.file
router.get('/sources', getSources);
router.get('/sources/:id', getSource);
router.put('/sources/:id', updateSource);
router.put('/sources/reprocess/:id', reprocessSource);
router.delete('/sources/:id', deleteSource);
router.put('/sources/updateenabled/:id', updateSourceEnable);

export default router;
