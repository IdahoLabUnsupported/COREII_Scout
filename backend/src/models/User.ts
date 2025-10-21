// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';

interface IUser {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    scoutAdmin: boolean;
    sessionToken: string;
    refreshToken: string;
    key: string;
    comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    scoutAdmin: { type: Boolean, default: false },
    sessionToken: { type: String, },
    refreshToken: { type: String, },
    key: { type: String, },
}, { timestamps: true });

// Mongoose middleware function called on save to hash modified passwords
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare incoming with stored password 
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model<IUser>('User', userSchema);

export default User;