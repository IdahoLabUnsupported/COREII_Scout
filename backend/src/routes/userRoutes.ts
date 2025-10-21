// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router } from 'express';
import { createUser, getUsers, getUser, updateUser, deleteUser, saveKey, getKey } from '../handlers/userHandler';

const router = Router();

router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/key', saveKey);
router.get('/users/get/key', getKey);

export default router;
