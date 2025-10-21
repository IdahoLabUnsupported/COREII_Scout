// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Request, Response } from 'express';
import Settings from '../models/Settings';
import fetchRSSFeeds from '../services/parsers/rssReader';

export const createOrUpdateSettings = async (req: Request, res: Response) => {
    const { settingName, rss, models, updateFrequency, sortBy, articlesPerFeed, allowEmailNotifications, bertopicModelType } = req.body;
    
    try {
        const updateFields: any = {};

        if (rss) {
            if (rss.rssFeeds && Array.isArray(rss.rssFeeds) && rss.rssFeeds.length > 0) {
                updateFields["rss.rssFeeds"] = rss.rssFeeds;
            } else {
                // Fetch default RSS feeds if none are provided or if the array is empty
                const defaultFeeds = await fetchRSSFeeds();
                updateFields["rss.rssFeeds"] = defaultFeeds;
            }

            if (rss.updateFrequency !== undefined) {
                updateFields["rss.updateFrequency"] = rss.updateFrequency;
            }
            if (rss.sortBy) {
                updateFields["rss.sortBy"] = rss.sortBy;
            }
            if (rss.articlesPerFeed !== undefined) {
                updateFields["rss.articlesPerFeed"] = rss.articlesPerFeed;
            }
            if (rss.allowEmailNotifications !== undefined) {
                updateFields["rss.allowEmailNotifications"] = rss.allowEmailNotifications;
            }
        } else {
            // Fetch default RSS feeds if rss object is not provided
            const defaultFeeds = await fetchRSSFeeds();
            updateFields["rss"] = { rssFeeds: defaultFeeds };
        }

        if (models) {
            updateFields["models"] = models;
        }

        if (bertopicModelType !== undefined) {
            updateFields["bertopicModelType"] = bertopicModelType;
        }

        let setting = await Settings.findOneAndUpdate(
            { settingName },
            { $set: updateFields },
            { new: true, upsert: true }
        );

        res.status(200).json(setting);
    } catch (err) {
        console.error('Error updating settings:', err); 
        res.status(500).json({ error: 'Failed to update settings' });
    }
};


export const getSettings = async (req: Request, res: Response) => {
    const { settingName } = req.query;
    try {
        let settings = await Settings.findOne({ settingName });

        if (settings) {
            res.status(200).json(settings);
        } else {
            settings = new Settings({
                settingName: settingName || 'default_settings',
            });
            await settings.save();
            res.status(201).json(settings);
        }
    } catch (err) {
        res.status(500).json({ error: err });
    }
};

export const deleteSetting = async (req: Request, res: Response) => {
    try {
        const setting = await Settings.findOneAndDelete({ settingName: req.params.settingName });
        if (!setting) {
            return res.status(404).json({ message: 'Setting not found' });
        }
        res.status(200).json({ message: 'Setting deleted' });
    } catch (err) {
        res.status(500).json({ error: err });
    }
};