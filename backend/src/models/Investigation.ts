// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model } from 'mongoose';
import versionSchema, { IVersion } from './Versioner';

interface IInvestigation {
  derivedFromSourceId: number;
  predictions: Array<{
    entity_text: string,
    entity_label: string,
    confidence: number,
    start_pos: number,
    end_pos: number,
    tramStatus: string
  }>;
  currentStixVersionId: number;
  stix: IVersion[];
  highlightRanges: any[];
  comments: string;
  enabled: boolean;
}

const HighlightRangeSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  // other properties can be included if needed
});

const PredictionSchema = new Schema({
  entity_text: { type: String, required: true },
  entity_label: { type: String, required: true },
  confidence: { type: Number, required: true },
  start_pos: { type: Number, required: true },
  end_pos: { type: Number, required: true },
  tramStatus: { type: String, required: true, default: "review" }
});

const investigationSchema = new Schema<IInvestigation>({
  derivedFromSourceId: { type: Number, ref: 'Source', required: true },
  predictions: { type: [PredictionSchema], required: true },
  stix: { type: [versionSchema], default: [] },
  currentStixVersionId: { type: Number, ref: 'Source', required: true },
  comments: { type: String },
  enabled: { type: Boolean, default: true },
});

const Investigation = model<IInvestigation>('Investigation', investigationSchema);

export default Investigation;