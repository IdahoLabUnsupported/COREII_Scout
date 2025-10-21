// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import Cookies from 'js-cookie';

// Function to store the token in a cookie
export const storeToken = (token: string) => {
  Cookies.set('authToken', token, { secure: true, sameSite: 'Strict', expires: 7 }); // 7 days expiration
};

// Function to retrieve the token from the cookie
export const getToken = () => {
  return Cookies.get('authToken');
};

// Function to remove the token from the cookie (for logout)
export const removeToken = () => {
  Cookies.remove('authToken');
};

// Function to check if the user is authenticated based on the presence of the token
export const isAuthenticated = () => {
  return !!getToken(); // Returns true if there's a token, false otherwise
};
