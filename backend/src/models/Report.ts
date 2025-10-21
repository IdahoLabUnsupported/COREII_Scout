// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model } from 'mongoose';
import { IVersion, versionSchema } from './Versioner';

const defaultSystemPrompt: string = `You are a cybersecurity AI assistant that helps people find answers to their
      questions. Your users are cyber security analysts for Idaho National Laboratory. 
      You are polite, but give direct answers and do not repeat the question. You will often be provided
      with additional information for use in answering your questions. Use this information as much as 
      possible to respond to the user.`;

const defaultUserPrompt: string = `I will provide to you first an optional comments field including analyst comments 
      pertaining to the subsequent objects that will also be sent in. These objects are a number of news like
      articles ranging from 1 or more with each article also having an optional bibliography. This will be in 
      an array where the comments, if they exist, will come first, then the rest will be articles and their 
      optional bibliography which may or may not be complete will follow. Could you go through all the articles
      and give a brief report which takes the report comments and optionally the article bibliography into 
      consideration? This report should just be a long text string in paragraph format. 
      Do not repeat this question. 
      Based on your own knowledge, and the articles provided: Write a recommendation report.
      This should be no more than: 1000 words long. 
      Written in the tone of: Cybersecurity Analyst. 
      Written by: Prompt muse. 
      Target Demographic is: 50-60 year old, cybersecurity executives.
      The article should flow well, start with a catchy introduction/hook, and end in a compelling, and 
      thought-provoking conclusion/outro, and contain mitigations to issues.
      Add a couple of sub-headings, but ONLY where appropriate - not too many. 
      Try to be unbiased and view different perspectives. 
      Create a catchy headline/title which would intrigue the reader.
      Given known cybersecurity keywords, add as many cluster Keywords around cybersecurity keywords, as 
      you can within the article, and use a variety of Synonyms where applicable.
      Areas to cover: Impact, Mitigations, Exposure, References
      ADD a DISCLAIMER that this report was written by a AI Language model with 'INL Inside'."
      Here are the comments and articles to analyze: `;

interface ITask {
    title: string;
    isCompleted: boolean;
}

interface IProgressItem {
    label: string;
    link: string;
    tasks: ITask[];
}

interface IReportVersion {
    version: number;
    textVersion: number;
    stixVersion: number;
}

interface IReportSettings {
    nerUri: string;
    llmUri: string;
    useRemoteNer: boolean;
    useRemoteLlm: boolean;
}

interface IReport {
    id: number,
    title: string;
    sourceList: [string];
    target: string;
    goals: string;
    requirements: string;
    synopsis: string;
    dueDate: string;
    requestedBy: string;
    createdOn: Date;
    createdBy: string;
    progressChecklist: IProgressItem[];
    userName: string;
    user: Schema.Types.ObjectId;
    generatedReports:  IVersion[];
    currentTextVersionId: number;
    versionRecords: IReportVersion[];  
    currentReportVersion: number;
    comments: string;
    aceReport: any;
    settings: IReportSettings;
    llmSystemPrompt: string;
    llmUserPrompt: string;
    version?: string;
}

const taskSchema = new Schema<ITask>({
    title:      { type: String, required: true },
    isCompleted:  { type: Boolean, required: true }
});

const progressStepSchema = new Schema<IProgressItem>({
    label: { type: String, required: true },
    link: { type: String, required: true },
    tasks: { type: [taskSchema], required: true }
});

const VersionRecordSchema = new Schema<IReportVersion>({
    version: Number,
    textVersion: Number,
    stixVersion: Number
});

const reportSettingsSchema = new Schema<IReportSettings>({
    nerUri: { type: String, default: "mistralai/Mistral-Nemo-Instruct-2407", },
    llmUri: { type: String, default: "facebook/bart-large-cnn", },
    useRemoteNer: { type: Boolean, default: false, },
    useRemoteLlm: { type: Boolean, default: true, },
});

const reportSchema = new Schema<IReport>({
    id:           { type: Number, required: true },
    title:        { type: String, required: true },
    dueDate:      { type: String },
    target:       { type: String },
    goals:        { type: String },
    requirements: { type: String },
    synopsis:     { type: String },
    requestedBy:  { type: String },
    createdBy:    { type: String },
    userName:     { type: String },
    createdOn:    { type: Date, default: Date.now},
    sourceList:   [{ type: String, ref: 'Source' }],
    user:         { type: Schema.Types.ObjectId, ref: 'User' },
    progressChecklist: [progressStepSchema],
    generatedReports: { type: [versionSchema], default: [] },
    currentTextVersionId: { type: Number, default: 0 },
    versionRecords: [VersionRecordSchema], 
    currentReportVersion: { type: Number, default: 0 },
    comments:     { type: String },
    aceReport: { type: Schema.Types.Mixed },
    settings: { type: reportSettingsSchema, default: () => ({}) },
    llmSystemPrompt: { type: String, default: defaultSystemPrompt },
    llmUserPrompt: { type: String, default: defaultUserPrompt },
    version: { type: String },
});

const Report = model<IReport>('Report', reportSchema);

export default Report;
