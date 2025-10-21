// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model } from 'mongoose';

export type Annotation = {
    content: string;
    label: string;
    status: string;
  };

type SourceData = {
    sourceText: string;
    annotations?: Annotation[];
  };

interface ISource {
    id: number
    title: string;
    sourceText: string;
    authorFirst: string;
    authorLast: string;
    year: string;
    publishedTitle: string;
    placement: string;
    city: string;
    publisher: string;
    url?: string | null;
    file?: File | null;
    processed: number;
    createdOn: string;
    actions: any[];
    data: SourceData;
    investigation?: Schema.Types.ObjectId;
    modelJSONResults?: Object,
    enabled: boolean,
}

// Define the Annotation sub-schema
const AnnotationSchema = new Schema({
  // Define the fields for the Annotation schema here
  // Assuming Annotation has some fields like type and value
  type: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  }
});

// Define the SourceData schema
const SourceDataSchema = new Schema({
  sourceText: {
    type: String,
    required: true
  },
  annotations: [AnnotationSchema]
});

const sourceSchema = new Schema<ISource>({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    sourceText: { type: String },
    authorFirst: { type: String },
    authorLast: { type: String },
    year: { type: String },
    publishedTitle: { type: String },
    placement: { type: String },
    city: { type: String },
    publisher: { type: String },
    url: { type: Schema.Types.Mixed },
    file: { type: Buffer },
    processed: { type: Number },
    createdOn: { type: String },
    actions: { type: [] },
    data: { type: SourceDataSchema },
    investigation: { type: Schema.Types.ObjectId, ref: 'Investigation' /*, required: true*/ },
    modelJSONResults: { type: Object, },
    enabled: { type: Boolean, default: true },
});

const Source = model<ISource>('Source', sourceSchema);

export default Source;