// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model, Types } from 'mongoose';

type userRoles = 'read' | 'write' | 'report_admin'; 

interface IPermissions {
    userId: Types.ObjectId;
    reportId: Types.ObjectId;
    access: userRoles;
    grantedBy: Types.ObjectId;
    createdAt: Date;
}

const permissionsSchema = new Schema<IPermissions>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
    access: { type: String, enum: ['read', 'write', 'report_admin'], required: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const Permissions = model<IPermissions>('Permissions', permissionsSchema);

export default Permissions;