// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
/* 
The purpose of this file is to extend the express request to allow it to understand
the incoming request user type of Request.user during auth methods and tie it to our own backend type.

Note: Import may say unused but its removal will cause an error declaring types of Request.user
primarily in the autheticating functions.
*/
import { Request } from "express";

interface IUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    scoutAdmin: boolean;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}