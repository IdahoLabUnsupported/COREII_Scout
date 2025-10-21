// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import inquirer from 'inquirer';
import mongoose from 'mongoose';
import User from '../models/User';

// Connect to MongoDB
//TODO:
const MONGO_URI = process.env.DB_URI || "mongodb://scout:admin@127.0.0.1:27017";
const connectionOptions = {
    dbName: "scout"
}

mongoose.connect(MONGO_URI || "", connectionOptions)
    .catch(error => console.error('Database connection error', error));

// Function to check if a user is the project admin
const isProjectAdmin = async (email: string): Promise<boolean> => {
    const user = await User.findOne({ email, scoutAdmin: true });
    return user ? user.scoutAdmin : false;
};

// Function to reset the password
const resetPassword = async (email: string, newPassword: string): Promise<void> => {

    const user = await User.findOne({ email });
    if (user) {
        user.password = newPassword; // Remember to hash the password before saving
        await user.save();
        console.log(`Password for ${email} has been reset.`);
    } else {
        console.error('User not found.');
    }
};

const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

// Main function to run the CLI
const run = async () => {
    try {
        const { email } = await inquirer.prompt({
            type: 'input',
            name: 'email',
            message: 'Enter admin email:',
            validate: (input) => input ? true : 'Email is required'
        });

        // Check if the entered username is the project admin
        if (!await isProjectAdmin(email)) {
            console.error('Error: The email entered is not the scout admin');
            process.exit(1);
        }

        const { newPassword } = await inquirer.prompt({
            type: 'password',
            name: 'newPassword',
            message: 'Enter new password:',
            mask: '*',
            validate: (input) => input ? true : 'Password is required'
        });

        if (!validatePassword(newPassword)) {
            console.error("Password does not meet requirements: at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
            process.exit(1);
        }

        const { confirmPassword } = await inquirer.prompt({
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm new password:',
            mask: '*',
            validate: (input) => input ? true : 'Please confirm the password'
        });

        if (newPassword !== confirmPassword) {
            console.error('Passwords do not match.');
            process.exit(1);
        }

        await resetPassword(email, newPassword);
    } catch (error) {
        console.error('An error occurred:', error);
    } 
    finally {
        mongoose.connection.close();
    }
};

// Ensure the script runs only when this file is directly executed
if (require.main === module) {
  run();
}
