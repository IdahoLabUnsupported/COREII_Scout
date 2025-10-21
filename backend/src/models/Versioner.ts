// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema } from 'mongoose';

export interface IVersion {
    versionId: number;
    date: Date;
    data: {
        article: string;
        [key: string]: any;
    };
};

export const versionSchema = new Schema<IVersion>({
    versionId: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    data: { type: Schema.Types.Mixed, required: true }
});

//const Version = model<IVersion>('Version', versionSchema);

export default versionSchema;