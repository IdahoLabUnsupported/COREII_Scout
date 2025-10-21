// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
export const preProcessArticleText = (inputString: string): string => {
    // Replace all carriage return characters with an empty string
    return inputString.replace(/\r\n/g, '\n');
};