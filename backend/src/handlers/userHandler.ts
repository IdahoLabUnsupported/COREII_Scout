// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

export const createUser = async (req: Request, res: Response) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const saveKey = async (req: Request, res: Response) => {
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

    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ message: "Key is required." });
    }

    user.key = key;
    await user.save();

    res.status(200).json({ message: "Success." });
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const getKey = async (req: Request, res: Response) => {
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

    res.status(200).json({ key: user.key });
  } catch (error) {
    console.error('Error during token verification or user lookup:', error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const validateUserApiKeyForLlm = async (token: string): Promise<string | undefined> => {

    let apiKey: string | undefined = undefined;
    const keyPattern = /^[\w\W]{5}-[\w\W]{5}-[\w\W]{5}-[\w\W]{5}-[\w\W]{5}$/; // 5 groups of 5 chars separated by dashes, no lead or trailing dash
    
    try {
        const payload = jwt.verify(token, process.env.SESSION_TOKEN_SECRET as string) as any;
        const email = payload.email;

        if (!email) {
            console.error('Email not found in token payload');
        } 
        else {
            const user = await User.findOne({ email });

            if (user && user.key && keyPattern.test(user.key.trim())) {
                return user.key.trim();
            } 
            else {
                console.error('API key for user not found or invalid. Trying environmental method.');
            }
        }
    } 
    catch (error) {
        console.error('Error during token verification or user lookup:', error);
    }

    apiKey = process.env.REMOTE_SERVER_API_KEY;
    if (apiKey && apiKey.trim() !== "" && keyPattern.test(apiKey.trim())) {
        return apiKey.trim();
    } 
    else {
        console.log('No API key exists in project')
        return undefined;
    }
}