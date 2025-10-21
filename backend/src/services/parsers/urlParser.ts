// Copyright 2025 Idaho National Laboratory. All rights reserved.
import axios from 'axios';
import * as cheerio from 'cheerio'; //https://cheerio.js.org/

export default async function parseWebpage(url: string) {
    try {
        // Use axios with proper error handling instead of cheerio.fromURL
        // cheerio.fromURL has issues with redirects that produce relative URLs
        const { data } = await axios.get(url, {
            timeout: 10000, // 10 second timeout
            maxRedirects: 5, // Allow redirects
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Accept only success status codes
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content');
        const paragraphs = $('p').text();
        
        return {
            title,
            metaDescription,
            paragraphs,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Webpage parsing failed for URL ${url}: `, errorMessage);
        return null; // Return null instead of undefined for clearer error handling
    }
}