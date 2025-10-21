// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import passport from 'passport';

const router = Router();

const generateSessionToken = (payload: object) => {
    return jwt.sign(payload, process.env.SESSION_TOKEN_SECRET as string/*, { expiresIn: '15m' }*/);
};

const generateRefreshToken = (payload: object) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string/*, { expiresIn: '7d' }*/);
};

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).send('Invalid credentials.');
    }

    const payload = { id: user._id, email: user.email };
    const sessionToken = generateSessionToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // database save
    user.sessionToken = sessionToken;
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, { httpOnly: true });
    res.status(200).json({ sessionToken });
});

router.post('/register', async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        const existingAccount = await User.findOne({ email: email });
        if (existingAccount) {
            return res.status(400).json({ message: "Email already in use"});
        }

        // Scout admin check
        const userCount = await User.countDocuments();
        const isFirstUserAccount = userCount === 0;

        const user = new User({ firstName, lastName, email, password, scoutAdmin: isFirstUserAccount });
        await user.save();

        res.status(201).json({ message: "User Created" });
    }
    catch (exception) {
        res.status(400).json({ message: "User could not be created"});
    }
});

// Refresh session token
router.post('/refresh-session', async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as any;
        const newSessionToken = generateSessionToken({ userId: payload.userId });

        res.status(200).json({ sessionToken: newSessionToken });
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
});

// Refresh refresh token
router.post('/refresh-refresh-token', async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as any;
   
        const user = await User.findById(payload.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const newRefreshToken = generateRefreshToken({ userId: payload.userId });
        user.refreshToken = newRefreshToken;
        await user.save();

        res.cookie('refreshToken', newRefreshToken, { httpOnly: true });
        res.status(200).json({ refreshToken: newRefreshToken });
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
});

router.get('/jwt', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the header
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.SESSION_TOKEN_SECRET as string) as any;
    const email = payload.email;

    if (!email) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ email: user.email });
  } catch (error) {
    console.error('Error during token verification or user lookup:', error);
    res.status(401).json({ message: "Unauthorized" });
  }
});

router.get('/dashboard', passport.authenticate('jwt', { session: false }), (req: Request, res: Response) => {
  res.json({ message: "Protected route accessed", user: req.user })
});

export default router;
