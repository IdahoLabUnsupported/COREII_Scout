// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Request, Response } from 'express';
import axios from 'axios';
import Source from '../models/Source';
import Report from '../models/Report';
import Investigation from '../models/Investigation';
import parseWebpage from '../services/parsers/urlParser';
import parsePDF from '../services/parsers/pdfParser';
import https from 'https';
import { preProcessArticleText } from '../services/typescript/textProcessing';

const USE_REMOTE_NER_SERVICE: boolean = process.env.USE_REMOTE_NER_SERVICE === 'true';
const LOCAL_NER_SERVICE_URL: string = process.env.LOCAL_NER_SERVICE_URL || 'http://localhost:8001/ner';
const nerServiceUrl: string | undefined = USE_REMOTE_NER_SERVICE
  ? process.env.REMOTE_NER_URL
  : LOCAL_NER_SERVICE_URL

const STIX_SERVICE_URL: string = process.env.STIX_SERVICE_URL || 'http://localhost:8000/stixconversion';

//const CERTS_PATH = process.env.SSL_CERT_FILE || '';
let agent;
try {
    agent = new https.Agent({
        rejectUnauthorized: false //TODO: this is a temporary solution, must use below when REMOTE cert is resolved
        //ca: fs.readFileSync(CERTS_PATH),
    });
} catch (error) {
    console.error('Failed to set up HTTPS Agent with custom CA certificate', error);
    agent = undefined; // Fallback to default agent
}

export const callNERModel = async (sourceText: string, sourceId: string) => {
        const modelExpectedJson = { "article" : sourceText };
        try {
            const modelResponse = await axios.post(`${nerServiceUrl}`, modelExpectedJson, {
                httpsAgent: agent
            });
            const stixResponse = await callStixConverter(modelResponse.data.predictions);
            stixResponse.data.article = modelExpectedJson?.article;

            const newStixVersion = {
                versionId: 0,
                data: stixResponse.data,
            }
            const investigation = new Investigation({ 
                derivedFromSourceId: sourceId, 
                predictions: modelResponse.data.predictions || [], 
                stix: [newStixVersion],
                currentStixVersionId: newStixVersion.versionId,
                tramStatusArray: Array<string>(modelResponse.data.predictions.length).fill("review"),
            })
            await investigation.save();
            return investigation;
        }
        catch (error) {
            console.error('Model Call Error: ', error);
            throw(error);
        }
}

export const callStixConverter = async (predictions: JSON) => {
    return await axios.post(`${STIX_SERVICE_URL}`, predictions);
};

const processSourceWithCyNER = async (processedArticleText: string, sourceId: string) => {
    try {
        const nerModelResults = await callNERModel(processedArticleText, sourceId);
        
        // Update source status to "complete"
        await Source.findOneAndUpdate(
            { id: sourceId },
            { processed: 1 }, // 1 = complete
            { new: true }
        );
        
        console.log(`CyNER processing completed for source ${sourceId}`);
        return nerModelResults;
    } catch (error) {
        console.error(`CyNER processing failed for source ${sourceId}:`, error);
        
        // Update source status to "failed"
        await Source.findOneAndUpdate(
            { id: sourceId },
            { processed: -1 }, // -1 = failed
            { new: true }
        );
        
        throw error;
    }
};

const reprocessSourceWithCyNER = async (processedArticleText: string, sourceId: string) => {
    try {
        const existingInvestigation = await Investigation.findOne({ derivedFromSourceId: sourceId });

        if (existingInvestigation) {
            const modelExpectedJson = { "article": processedArticleText };
            const modelResponse = await axios.post(`${nerServiceUrl}`, modelExpectedJson, {
                httpsAgent: agent
            });
            const stixResponse = await callStixConverter(modelResponse.data.predictions);
            stixResponse.data.article = modelExpectedJson?.article;

            const newStixVersion = {
                versionId: existingInvestigation.stix.length,
                data: stixResponse.data,
                date: new Date()
            }

            existingInvestigation.predictions = modelResponse.data.predictions || [];
            existingInvestigation.stix.push(newStixVersion);
            existingInvestigation.currentStixVersionId = newStixVersion.versionId;
            await existingInvestigation.save();

            // Update source status to "complete"
            await Source.findOneAndUpdate(
                { id: sourceId },
                { processed: 1 }, // 1 = complete
                { new: true }
            );

            console.log(`CyNER reprocessing completed for source ${sourceId}`);
            return existingInvestigation;
        } else {
            throw new Error('Investigation not found');
        }
    } catch (error) {
        console.error(`CyNER reprocessing failed for source ${sourceId}:`, error);
        
        // Update source status to "failed"
        await Source.findOneAndUpdate(
            { id: sourceId },
            { processed: -1 }, // -1 = failed
            { new: true }
        );
        
        throw error;
    }
};

export const createSource = async (req: Request, res: Response) => {
    try {
        const source = new Source(req.body);
        var articleText: string = "";
        //file
        if (req.file) {
            const mimeType = req.file.mimetype;
    
            if (mimeType === 'application/pdf') {
                // PDF file
                const returnedParsedPDF = await parsePDF(req.file as Express.Multer.File);
                articleText = returnedParsedPDF;
            } else if (mimeType === 'text/plain') {
                // text file
                articleText = req.file.buffer.toString('utf-8');
            } else {
                return res.status(400).send('Unsupported file type');
            }
        }
        else {
            //pasted text
            if (source.sourceText && source.sourceText !== undefined && source.sourceText !== null && source.sourceText.trim() !== "" && source.sourceText != "null") {
                articleText = source.sourceText;
            }
            //url
            else if (source.url && source.url !== undefined && source.url !== null && source.url.trim() !== "") {
                const returnedParsedURL = await parseWebpage(source.url);
                if (returnedParsedURL !== null && returnedParsedURL !== undefined) {
                    let title = returnedParsedURL.title;
                    let metaDescription = returnedParsedURL.metaDescription;
                    let paragraphs = returnedParsedURL.paragraphs;
                    
                    let parts = [];
                    // Conditionally add each part if it is defined and not empty
                    if (title && title.trim() !== '') {
                        parts.push(`Title: ${title.trim()}`);
                    }
                    if (metaDescription && metaDescription.trim() !== '') {
                        parts.push(`Meta Description: ${metaDescription.trim()}`);
                    }
                    if (paragraphs && paragraphs.trim() !== '') {
                        parts.push(`Paragraphs: ${paragraphs.trim()}`);
                    }
                    
                    if (parts.length > 0) {
                        articleText = parts.join('\n');
                    } else {
                        // If we got a response but no content, create a minimal article text
                        articleText = `URL: ${source.url}\nContent could not be extracted from this URL.`;
                    }
                } else {
                    // URL parsing failed completely - create a minimal article text with the URL
                    console.error(`Failed to parse URL: ${source.url}`);
                    articleText = `URL: ${source.url}\nFailed to fetch content from this URL. The article may be behind a paywall, require authentication, or the URL may be invalid.`;
                }
            }
        }
       const processedArticleText = preProcessArticleText(articleText)

        // Ensure we have some content to process
        if (!processedArticleText || processedArticleText.trim() === '') {
            const errorMsg = 'No content could be extracted from the provided source. Please check the URL or provide text directly.';
            console.error(errorMsg);
            return res.status(400).json({ error: errorMsg });
        }

        if (!source.data) { source.data = { sourceText: "",  annotations: [] }; }; // Initialize data if it doesn't exist
        source.data.sourceText = processedArticleText;
        
        // Set processing status to "processing" and save immediately
        source.processed = 0; // 0 = processing
        await source.save();
        
        // Return the source immediately so it appears in the Report Source List
        res.status(201).send(source);
        
        // Start CyNER processing in the background
        processSourceWithCyNER(processedArticleText, source.id);
        
    } catch (error) {
        res.status(400).send(error);
    }
};

export const getSources = async (req: Request, res: Response) => {
    try {
        const sources = await Source.find();
        res.status(200).send(sources);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getSource = async (req: Request, res: Response) => {
    try {
        const source = await Source.findOne({ id: req.params.id });
        if (!source) {
            return res.status(404).send();
        }
        res.status(200).send(source);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateSource = async (req: Request, res: Response) => {
    try {
        const source = await Source.findByIdAndUpdate(req.body.source._id, req.body.source, { new: true, runValidators: true });
        if (!source) {
            return res.status(404).send();
        }
        res.status(200).send(source);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const deleteSource = async (req: Request, res: Response) => {
    try {
        const source = await Source.findByIdAndDelete(req.body._id);
        if (!source) {
            return res.status(404).send({ message: 'Source not found' });
        }

        // Update the report by pulling the sourceId from sourceList
        const report = await Report.findOneAndUpdate(
            { id: req.body.reportId }, // Find the report by custom ID
            { $pull: { sourceList: req.params.id } }, // Pull the sourceId from sourceList array
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        if (!report) {
            return res.status(404).send({ message: 'Report not found' });
        }
        res.status(200).send({ message: 'Source deleted and report updated', source, report });
    } catch (error) {
        res.status(500).send({ message: 'An error occurred', error });
    }
};

/*
 * This also alters the result's object enable field so the llmApiCaller does not have to
 * retrieve sources and be more scaleable.
 */
export const updateSourceEnable = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).send({ message: 'Invalid input. Ensure id is a string and enabled is a boolean.' });
    }
    try {
        const source = await Source.findOneAndUpdate(
            { id },
            { enabled },
            { new: true, runValidators: true }
        );

        const derivedFromSourceId = id;
        const investigation = await Investigation.findOneAndUpdate(
            { derivedFromSourceId },
            { enabled },
            { new: true, runValidators: true }
        );

        if (!source || !investigation) {
            return res.status(404).send({ message: 'Data not found' });
        }
        res.status(200).send(source);
    } catch (error) {
        res.status(500).send({ message: 'Internal server error', error });
    }
};

export const reprocessSource = async (req: Request, res: Response) => {
    try {
        const source = await Source.findById(req.body.source._id);
        if (!source) {
            return res.status(404).send();
        }

        let articleText: string = "";
        if (req.file) {
            const mimeType = req.file.mimetype;
            if (mimeType === 'application/pdf') {
                const returnedParsedPDF = await parsePDF(req.file as Express.Multer.File);
                articleText = returnedParsedPDF;
            } else if (mimeType === 'text/plain') {
                articleText = req.file.buffer.toString('utf-8');
            } else {
                return res.status(400).send('Unsupported file type');
            }
        } else {
            if (source.sourceText && source.sourceText.trim() !== "" && source.sourceText != "null") {
                articleText = source.sourceText;
            } else if (source.url && source.url.trim() !== "") {
                const returnedParsedURL = await parseWebpage(source.url);
                if (returnedParsedURL !== null && returnedParsedURL !== undefined) {
                    let title = returnedParsedURL.title;
                    let metaDescription = returnedParsedURL.metaDescription;
                    let paragraphs = returnedParsedURL.paragraphs;

                    let parts = [];
                    if (title && title.trim() !== '') parts.push(`Title: ${title.trim()}`);
                    if (metaDescription && metaDescription.trim() !== '') parts.push(`Meta Description: ${metaDescription.trim()}`);
                    if (paragraphs && paragraphs.trim() !== '') parts.push(`Paragraphs: ${paragraphs.trim()}`);
                    
                    if (parts.length > 0) {
                        articleText = parts.join('\n');
                    } else {
                        articleText = `URL: ${source.url}\nContent could not be extracted from this URL.`;
                    }
                } else {
                    console.error(`Failed to reparse URL: ${source.url}`);
                    articleText = `URL: ${source.url}\nFailed to fetch content from this URL. The article may be behind a paywall, require authentication, or the URL may be invalid.`;
                }
            }
        }

        const processedArticleText = preProcessArticleText(articleText);
        
        // Ensure we have some content to reprocess
        if (!processedArticleText || processedArticleText.trim() === '') {
            const errorMsg = 'No content could be extracted for reprocessing. Please check the source URL or provide text directly.';
            console.error(errorMsg);
            return res.status(400).json({ error: errorMsg });
        }
        
        source.data.sourceText = processedArticleText;
        
        // Set processing status and save immediately
        source.processed = 0; // 0 = processing
        await source.save();
        
        // Return source immediately so status updates in UI
        res.status(200).send(source);
        
        // Start reprocessing in background
        reprocessSourceWithCyNER(processedArticleText, source.id);
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
};
