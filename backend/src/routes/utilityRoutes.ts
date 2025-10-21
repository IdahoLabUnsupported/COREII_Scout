// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router, Request, Response } from 'express';
import fetchRSSFeeds from '../services/parsers/rssReader';

const router = Router();

router.get('/rss', async (req, res) => {
  try {
    const validFeedData = await fetchRSSFeeds();

    if (validFeedData.length === 0) {
      console.log('No valid feed data found.');
    } else {
      console.log('Fetched feed data:', validFeedData);
    }

    res.status(200).json(validFeedData);
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    res.status(500).send('Error fetching RSS feeds');
  }
});

router.post('/aceinput', (req: Request, res: Response) => {
    try {
        console.log('Input ACE data: ', req.body);
        res.status(201).json({message: 'Scout has successfully received ACE data.'});
    } catch (error) {
        res.status(400).send(error);
    }
});

export default router;
