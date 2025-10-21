// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

export type Annotation = {
  content: string;
  label: string;
  status: string;
};
 
export type SourceData = {
  sourceText: string;
  annotations: Annotation[];
};
 
export type Source = {
  id: number;
  _id?: number;
  title: string;
  sourceText?: string | null;
  url?: string | null;
  file?: File | null;
  processed: number;
  createdOn: string;
  actions: any[];
  data: SourceData;
  authorFirst: string;
  authorLast: string;
  year: string;
  publishedTitle: string;
  placement: string;
  city: string;
  publisher: string;
  enabled: boolean;
  [key: string]: any; // This makes sure TypeScript allows string indexing on Source
};
 
export interface IReportSettings {
    nerUri: string;
    llmUri: string;
    useRemoteNer: boolean;
    useRemoteLlm: boolean;
}

export type AppReport = {
  [x: string]: any;
  id: number;
  _id?: number;
  title: string;
  sourceList: Source[string];
  target?: string;
  goals?: string;
  requirements?: string;
  assignment?:string;
  synopsis?: string;
  dueDate?: string;
  requestedBy?: string;
  progressChecklist: IProgressItem[];
  userName: string;
  user: string | undefined;
  createdOn: string;
  createdBy?: string;
  STIXcode?: object;
  analystGeneratedText?: object;
  generatedReports?: Versioner[];
  currentTextVersionId: number;
  comments: string;
  settings?: IReportSettings;
  llmSystemPrompt?: string;
  llmUserPrompt?: string;
};

export type Versioner = {
  versionId: string;
  _id: string;
  date: Date;
  data: any;
}
 
export type STIXBundle = {
  type: string;
  id: string;
  objects: JSON[]
}
 
export type Result = {
  _id: number;
  derivedFromSourceId: number;
  predictions: any[];
  stix: Versioner[];
  currentStixVersionId: number;
  comments: string;
  enabled: boolean;
}

export type JobStatus = {
  reportId: number;
  status: 'started' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  error?: string;
}
 
export type AppState = {
  openDrawerLeft: boolean;
  openDrawerLeftWidth: number;
  selectedReportIndex: number | null;
  reportsSharedList: any[];
  commonLinksList: any[];
  showNewReportView: boolean;
};

interface ITask {
  title: string;
  isCompleted: boolean;
}
 
export type IProgressItem = {
  label: string;
  link: string;
  tasks: ITask[];
}
 
export type LLMModel = {
    id: number;
    name: string;
    type: string;
    description?: string;
    status: string;
    active: boolean;
    uri: string;
};

export type BERTModel = {
    id: number;
    name: string;
    type: string;
    description?: string;
    status: string;
    active: boolean;
    uri: string;
};

export type UserRole = {
  id: number;
  name: string;
  permission: string;
}

export type CardItem = {
    id: string;
    hidden: boolean;
    title: string;
    url: string;
    description: string;
    tags: string;
    isMarked?: boolean;
}

export type Settings = {
    settingName: string;
    rssFeeds?: CardItem[];
    updateFrequency?: number;
    sortBy?: string;
    articlesPerFeed?: number;
    allowEmailNotifications?: boolean;
}

export type User = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    scoutAdmin: boolean;
}

export type RSSArticle = {
    id: string;
    source: string;
    title: string;
    url: string;
    publishedDate: string;
    summary: string;
    fullText: string;
    scrapedAt: string;
}

export type RSSCollectionJob = {
    id: string;
    type: 'date-range' | 'daily';
    startDate: string;
    endDate: string;
    recollect: boolean;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: {
        current: number;
        total: number;
        currentTask: string;
    };
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
}

export type RSSQueueStatus = {
    isProcessing: boolean;
    currentJob: RSSCollectionJob | null;
    queueLength: number;
    totalJobs: number;
}

export type RSSFeedConfig = {
    id: string;
    title: string;
    hidden?: boolean;
    url?: string;
    rssUrl: string;
    description?: string;
    tags?: string[];
    articleCount?: number;
}