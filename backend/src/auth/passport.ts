// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import passport from 'passport';
import User from "../models/User";

const opts: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.SESSION_TOKEN_SECRET as string,
};

passport.use(new JwtStrategy(opts, async (jwtPayload, done) => {
    try {
        const user = await User.findById(jwtPayload.id);
        if (user) return done(null, user);
        return done(null, false);
    }
    catch (exception) {
        return done(exception, false)
    }
}));

export default passport;