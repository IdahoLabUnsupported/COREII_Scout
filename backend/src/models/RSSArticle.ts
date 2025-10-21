// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model, Document } from 'mongoose';

export interface IRSSArticle extends Document {
  id: string;
  source: string;
  feedId: string;
  title: string;
  url: string;
  publishedDate: Date;
  collectedDate: Date;
  summary: string;
  contentFilePath: string; // Path to the full text file on filesystem
  author?: string;
  tags?: string[];
  guid?: string; // RSS GUID for deduplication
  imageUrl?: string;
  categories?: string[];
}

const RSSArticleSchema = new Schema<IRSSArticle>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  feedId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  publishedDate: {
    type: Date,
    required: true,
    index: true
  },
  collectedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  summary: {
    type: String,
    required: true
  },
  contentFilePath: {
    type: String,
    required: true
  },
  author: {
    type: String
  },
  tags: [{
    type: String
  }],
  guid: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  imageUrl: {
    type: String
  },
  categories: [{
    type: String
  }]
}, {
  timestamps: true,
  collection: 'rss_articles'
});

// Compound indexes for efficient queries
RSSArticleSchema.index({ source: 1, publishedDate: -1 });
RSSArticleSchema.index({ feedId: 1, publishedDate: -1 });
RSSArticleSchema.index({ publishedDate: -1, collectedDate: -1 });
RSSArticleSchema.index({ collectedDate: -1 });

// Index for date range queries
RSSArticleSchema.index({ 
  publishedDate: 1, 
  source: 1 
});

export default model<IRSSArticle>('RSSArticle', RSSArticleSchema);