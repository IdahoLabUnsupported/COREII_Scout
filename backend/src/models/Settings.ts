// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import mongoose, { Schema, model } from 'mongoose';

const defaultRssFeeds = [
      {
        id: '1',
        title: 'The Hacker News',
        hidden: false,
        url: 'https://thehackernews.com/',
        rssUrl: 'https://feeds.feedburner.com/TheHackersNews',
        description: 'A leading news platform dedicated to promoting awareness of cybersecurity, hacking, and technology.',
        tags: ['cybersecurity', 'hacking', 'technology'],
        articleCount: 0
      },
      {
        id: '2',
        title: 'Krebs on Security',
        hidden: false,
        url: 'https://krebsonsecurity.com/',
        rssUrl: 'https://krebsonsecurity.com/feed/',
        description: 'A blog by journalist Brian Krebs that covers cybersecurity and internet privacy.',
        tags: ['security', 'blog', 'malware'],
        articleCount: 0
      },
      {
        id: '3',
        title: 'Threatpost',
        hidden: false,
        url: 'https://threatpost.com/',
        rssUrl: 'https://threatpost.com/feed/',
        description: 'An independent news site that covers IT and cybersecurity.',
        tags: ['news', 'cybersecurity', 'IT'],
        articleCount: 0
      },
      {
        id: '4',
        title: 'Bleeping Computer',
        hidden: false,
        url: 'https://www.bleepingcomputer.com/',
        rssUrl: 'https://www.bleepingcomputer.com/feed/',
        description: 'A resource for technology solutions and cybersecurity news.',
        tags: ['technology', 'news', 'solutions'],
        articleCount: 0
      },
      {
        id: '5',
        title: 'Schneier on Security',
        hidden: false,
        url: 'https://www.schneier.com/',
        rssUrl: 'https://www.schneier.com/feed/atom/',
        description: 'A blog by Bruce Schneier, a renowned security technologist and author.',
        tags: ['security', 'blog', 'analysis'],
        articleCount: 0
      },
      {
        id: '6',
        title: 'Security Week',
        hidden: false,
        url: 'https://www.securityweek.com/',
        rssUrl: 'https://feeds.feedburner.com/securityweek',
        description: 'A leading source for IT security news and analysis.',
        tags: ['news', 'security', 'IT'],
        articleCount: 0
      },
      {
        id: '7',
        title: 'Dark Reading',
        hidden: false,
        url: 'https://www.darkreading.com/',
        rssUrl: 'https://www.darkreading.com/rss.xml',
        description: 'A comprehensive source for IT security professionals.',
        tags: ['news', 'security', 'IT'],
        articleCount: 0
      },
      {
        id: '8',
        title: 'CSO Online',
        hidden: false,
        url: 'https://www.csoonline.com/',
        rssUrl: 'https://www.csoonline.com/feed/',
        description: 'Provides news and insights on cybersecurity and risk management.',
        tags: ['security', 'risk', 'management'],
        articleCount: 0
      }
];

interface IRssFeed {
    id?: string;
    feedUrl?: string; 
    paginationLinks?: any;
    description?: string;
    pubDate?: string;
    title?: string;
    generator?: string;
    link?: string;
    hidden?: boolean;
    url?: string;
    rssUrl?: string; // RSS feed URL for collection
    tags?: string[];
    articleCount?: number; // Number of articles collected from this feed
}

interface IModel {
    id: number;
    name: string;
    type: string;
    description?: string;
    status: string;
    active: boolean;
    uri: string;
}

const RssFeedSchema = new Schema<IRssFeed>({
    id: { type: String, required: false },
    feedUrl: { type: String, required: false },
    paginationLinks: { type: Schema.Types.Mixed, required: false },
    title: { type: String, required: false },
    hidden: { type: Boolean, required: false },
    url: { type: String, required: false },
    rssUrl: { type: String, required: false },
    description: { type: String, required: false },
    tags: { type: [String], required: false },
    articleCount: { type: Number, default: 0 }
});

const modelSchema = new Schema<IModel>({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true, default: ''},
    description: { type: String, },
    status: { type: String, required: true },
    active: { type: Boolean, required: true },
    uri: { type: String, required: true },
});

interface ISettings {
    settingName: string;
    rss: {
        rssFeeds?: IRssFeed[];
        updateFrequency?: number;
        sortBy?: string;
        articlesPerFeed?: number;
        allowEmailNotifications?: boolean;
    }   
    models: IModel[];
    bertopicModelType?: 'simple' | 'complex';
}

interface ISettingsModel extends mongoose.Model<ISettings> {
    ensureInitialized(): Promise<void>;
}

const SettingsSchema = new Schema<ISettings>({
    settingName: { type: String, required: true, unique: true },
    rss: {
        updateFrequency: { type: Number, default: 10 },
        sortBy: { type: String, default: 'unread' },
        articlesPerFeed: { type: Number, default: 10 },
        allowEmailNotifications: { type: Boolean, default: false },
        rssFeeds: { 
            type: [RssFeedSchema], 
            required: false,
            default: []
        }
    },
    models: {
        type: [modelSchema],
        default: () => ([
            {
                id: 1,
                name: 'Scyner',
                type: 'NER',
                description: 'Local NER model',
                status: 'online',
                active: true,
                uri: `${process.env.LOCAL_NER_SERVICE_URL}` || 'http://localhost:8001/ner'
            },
            {
                id: 2,
                name: 'Mistral-Nemo',
                type: 'LLM',
                description: 'Remote hosted LLM',
                status: 'online',
                active: true,
                uri: `${process.env.REMOTE_LLM_URL}` || 'http://localhost:8002/summarizer'
            },
            {
                id: 3,
                name: 'Bertopic',
                type: 'Unsupervised',
                description: 'Topic model',
                status: 'online',
                active: true,
                uri: 'http://local-llm:8003'
            }
        ])
    },
    bertopicModelType: { 
        type: String, 
        enum: ['simple', 'complex'],
        default: 'simple' 
    }
});

SettingsSchema.statics.ensureInitialized = async function() {
  const settings = await this.findOne();
  if (!settings) {
    await this.create({ 
      settingName: 'default_settings', 
      rss: { rssFeeds: defaultRssFeeds } 
    });
  }
};

const Settings = model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;