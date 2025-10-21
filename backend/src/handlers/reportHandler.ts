// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Request, Response } from 'express';
import Report from '../models/Report';
import Investigation from '../models/Investigation';
import Source from '../models/Source';
import JobStatus from '../models/JobStatus';
import callRemoteLlmApiForReportSummary from '../services/remoteLLM/callLlmForReportSummary';
import callLocalSummarizer from '../services/localLLM/callLocalLlm';
import { StixBundle } from '../services/typescript/types';
import Permissions from '../models/Permissions';
import { validateUserApiKeyForLlm } from './userHandler';

export const createReport = async (req: Request, res: Response) => {
    try {
        const report = new Report(req.body);
        await report.save();
        res.status(201).send(report);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const getReports = async (req: Request, res: Response) => {
    try {
        const reports = await Report.find()//.populate('author investigation');
        res.status(200).send(reports);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getReport = async (req: Request, res: Response) => {
    try {
        const report = await Report.findOne({ id: req.params.id })//.populate('author investigation');
        if (!report) {
            return res.status(404).send();
        }
        res.status(200).send(report);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const addSourceToReport = async (req: Request, res: Response) => {
    try {
        const report = await Report.findOneAndUpdate( //findOne uses custom front end id as opposed to mongoose _id
            { id: req.params.reportId },
            { $addToSet: { sourceList: req.params.sourceId } }, // $addToSet appends only if not already present
            { new: true, runValidators: true } // Returns the updated document and runs validators
        );
        if (!report) {
            return res.status(404).send();
        }
        res.status(200).send(report);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const updateReport = async (req: Request, res: Response) => {
    try {
        const report = await Report.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true });
        if (!report) {
            return res.status(404).send();
        }
        res.status(200).send(report);
    } catch (error) {
        res.status(400).send(error);
    }
};



export const deleteReport = async (req: Request, res: Response) => {
    try {
        const reportId = req.params.id;
        const report = await Report.findOne({ id: reportId });

        if (!report) {
            return res.status(404).send({ message: 'Report not found' });
        }

        // Iterate through the sourceList and delete corresponding Source and Investigation documents
        for (const sourceId of report.sourceList) {
            await Source.findOneAndDelete({ id: sourceId });
            await Investigation.findOneAndDelete({ derivedFromSourceId: sourceId });
        }
        // Finally, delete the report itself after sources and results were deleted. 
        await Report.findByIdAndDelete(report._id);

        res.status(200).send({ message: 'Report and related sources/investigations deleted successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateComments = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comments } = req.body;

    if (comments === undefined) {
        return res.status(400).send("comments field is required");
    }

    try {
        const report = await Report.findOne({ id: id });

        if (!report) {
            return res.status(404).send('Report not found');
        }

        report.comments = comments; //replace comments with new ones here.

        await report.save();

        res.status(200).send('Comments updated successfully');
    } catch (error) {
        res.status(500).send('An error occurred while updating comments');
    }
}
export const getComments = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const report = await Report.findOne({ id: id });

        if (!report) {
            return res.status(404).send('Report not found');
        }

        res.status(200).json({ comments: report.comments });
    } catch (error) {
        res.status(500).send('An error occurred while retrieving comments');
    }
};

export const updateGeneratedReportTextVersion = async (id: string, data: any) => {
    try {
        const report = await Report.findOne({ id: id });
        if (!report) {
            throw new Error('Report not found');
        }

        const currentTextVersionId = report.currentTextVersionId;
        if (currentTextVersionId === undefined || currentTextVersionId === null) {
            throw new Error('currentTextVersionId is not defined');
        }
        // if generatedReports array is not initialized, initialize it
        if (!report.generatedReports) {
            report.generatedReports = [];
        }

        // ensure the generatedReports array is long enough
        while (report.generatedReports.length <= currentTextVersionId) {
            report.generatedReports.push({
                versionId: report.generatedReports.length,
                date: new Date(),
                data: data,
            });
        }

        // Update the data field at the currentTextVersionId index in the generatedReports array
        report.generatedReports[currentTextVersionId].data = await data; // have to await data promise
        const updatedReport = await report.save({ validateBeforeSave: true });

        return updatedReport;
    } catch (error) {
        throw error;
    }
};

export const newGeneratedReportTextVersion = async (id: string, data: any) => {
    try {
        const report = await Report.findOne({ id: id });
        if (!report) {
            throw new Error('Report not found');
        }

        // new version ID
        const newVersionId = report.generatedReports.length;

        // Create new report version object
        const newReportVersion = {
            versionId: newVersionId,
            date: new Date(),
            data: data // Ensure data is set correctly
        };

        // Update report by pushing the new version to the array
        const updatedReport = await Report.findOneAndUpdate(
            { id: id },
            {
                $push: { generatedReports: newReportVersion },
                $set: { currentTextVersionId: newVersionId } // Update currentTextVersionId
            },
            { new: true, runValidators: true } // Return updated document
        );

        if (!updatedReport) {
            throw new Error('Failed to update report');
        }

        return updatedReport;
    } catch (error) {
        throw error;
    }
};

export const newGeneratedReportTextVersionApi = async (req: Request, res: Response) => {
    try {
        const reportData = req.body.newReportTextVersionData;
        
        // Debug logging for Generated Report content
        console.log('=== Generated Report Debug ===');
        console.log('Report ID:', req.params.id);
        console.log('Data type:', typeof reportData);
        console.log('Data length:', JSON.stringify(reportData).length, 'characters');
        
        // Show first 500 characters of the data
        const dataString = JSON.stringify(reportData);
        console.log('Data preview (first 500 chars):', dataString.substring(0, 500));
        
        // If it's a Delta object, show structure
        if (reportData && typeof reportData === 'object' && reportData.ops) {
            console.log('Delta ops count:', reportData.ops.length);
            console.log('First few ops:', JSON.stringify(reportData.ops.slice(0, 3), null, 2));
        }
        console.log('=== End Debug ===');
        
        const updatedModel = await newGeneratedReportTextVersion(req.params.id, reportData);
        res.status(200).send(updatedModel);
    }
    catch (error) {
        console.error('Error in newGeneratedReportTextVersionApi:', error);
        res.status(404).send(error);
    }
};

export const saveVersion = async (req: Request, res: Response) => {
    try {
        const report = await Report.findOne({ id: req.params.id });
        if (!report) {
            return res.status(404).send('Report not found.');
        }
        
        
        // Validate derivedFromSourceId if provided and get investigation
        let investigation = null;
        if (req.body.derivedFromSourceId) {
            investigation = await Investigation.findById(req.body.derivedFromSourceId);
            if (!investigation) {
                return res.status(404).send('Source investigation not found.');
            }
        }

        // Get the current content from report.version field
        if (!report.version) {
            return res.status(400).send('No current content to save as version.');
        }

        // Create new content entry in generatedReports array
        const newTextVersionIndex = report.generatedReports.length;
        const newContentEntry = {
            versionId: newTextVersionIndex,
            date: new Date(),
            data: {
                article: report.version // Save the current content
            }
        };

        // Add content to generatedReports array
        report.generatedReports.push(newContentEntry);

        // Determine the new version number based on array length
        const newVersionNumber = report.versionRecords.length + 1;

        // Create a new version record that points to the newly saved content
        const newVersionRecord = {
            version: newVersionNumber,
            textVersion: newTextVersionIndex, // Point to the new content
            stixVersion: investigation ? investigation.currentStixVersionId : 0
        };
        
        // Append the new version record to the versionRecords field
        report.versionRecords.push(newVersionRecord);
        
        await report.save();
        
        res.status(200).json(newVersionRecord);
    } catch (error) {
        console.error('Error in saveVersion:', error);
        res.status(400).send(error);
    }
}

export const getVersionRecords = async (req: Request, res: Response) => {
    try {
        // Find the report by its ID
        const report = await Report.findOne({ id: req.params.id });
        if (!report) {
            return res.status(404).send('Report not found.');
        }
        const versionRecords = report.versionRecords || [];
        res.status(200).json(versionRecords);
    } catch (error) {
        res.status(400).send(error);
    }
}

export const updateCurrentTextVersionId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Assuming the report ID is passed as a URL parameter
        const newCurrentVersionId = Number(req.body.newCurrentVersionId);


        // Find the report by its ID
        const report = await Report.findOne({ id: id });
        if (!report) {
            return res.status(404).send({ message: "Report not found" });
        }


        // Ensure the new current version ID is within bounds
        if (newCurrentVersionId < 0 || newCurrentVersionId > report.versionRecords.length) {
            return res.status(400).send({ message: "Invalid version ID" });
        }

        // Update the current text version ID
        report.currentTextVersionId = newCurrentVersionId;

        // Save the updated report
        const updatedReport = await report.save({ validateBeforeSave: true });

        res.status(200).send(updatedReport);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getArticles = async (reportId: string): Promise<{ sourceArticles: (string | null)[] }> => {
    const requestId = reportId;
    try {
        // Find the report by ID
        const report = await Report.findOne({ id: requestId });
        if (!report) throw new Error('Report not found');

        const sourceArticles = [];
        for (let sourceId of report.sourceList) {
            const source = await Source.findOne({ id: sourceId });
            if (source && source.enabled) {
                sourceArticles.push(source.sourceText);
            } else {
                sourceArticles.push(null);
            }
        }
        return { sourceArticles };
    }
    catch (error) {
        throw error;
    }
};

export const getStix = async (reportId: string): Promise<{ stixJsons: StixBundle[] }> => {
    const requestId = reportId;
    try {
        const report = await Report.findOne({ id: requestId });
        if (!report) throw new Error('Report not found');
        const stixJsons: StixBundle[] = [];
        for (let sourceId of report.sourceList) {
            const source = await Source.findOne({ id: sourceId });
            if (source && source.enabled) { //could probably optimize this out with the singular get articles and stix api
                const investigation = await Investigation.findOne({ derivedFromSourceId: sourceId });
                if (investigation && investigation.stix) {
                    const version = investigation.stix.find(stix => stix.versionId === investigation.currentStixVersionId);
                    if (version && version.data) {
                        const data = version.data.stix as StixBundle; // Assume data matches StixBundle structure
                        if (data.type === 'bundle' && Array.isArray(data.objects)) {
                            stixJsons.push(data); //This pushes the full stix bundle, not just the objects
                        }
                    }
                }
            }
        }
        return { stixJsons };
    } catch (error) {
        throw error;
    }
};

export const getArticlesAndStixApi = async (req: Request, res: Response) => {
    const reportId = req.params.id;
    try {
        const result = await getArticlesAndStix(reportId);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report data', error });
    }
};

export const getArticlesAndStix = async (reportId: string): Promise<{ sourceArticles: (string | null)[], stixJsons: (any | null)[] }> => {
    try {
        const report = await Report.findOne({ id: reportId });
        if (!report) throw new Error('Report not found');

        const sourceIdArray = report.sourceList;

        const sourceArticles = [];
        const stixJsons = [];

        for (let sourceId of sourceIdArray) {
            const source = await Source.findOne({ id: sourceId });
            const investigation = await Investigation.findOne({ derivedFromSourceId: sourceId });

            if (source) {
                sourceArticles.push(source.sourceText);
            } else {
                sourceArticles.push(null);
            }

            if (investigation) {
                stixJsons.push(investigation.stix.find(stix => stix.versionId === investigation.currentStixVersionId));
            } else {
                stixJsons.push(null);
            }
        }
        return { sourceArticles, stixJsons };
    }
    catch (error) {
        throw error;
    }
};

export const getStixView = async (req: Request, res: Response) => {
    const reportId = req.params.id;
    try {
        const report = await Report.findOne({ id: reportId });
        if (!report) {
            return res.status(404).send('Report not found');
        }

        const sourceIdArray = report.sourceList; // Get all source + derivedFromSourceId id's
        if (!Array.isArray(sourceIdArray) || !sourceIdArray.length) { // If no sources have yet been created 
            return res.status(204).send('No sources for report.');
        }

        // Final returned array
        let stixViewFinalJson: any = [];

        // Top level array items
        const topLevelFields: any = {};

        // Add comments if they exist
        const comments = report.comments;
        if (comments) {
            const parsedComments = JSON.parse(comments); // Comment in form {"ops":[{"insert":"real comment here"}]}
            const realComments = parsedComments.ops.map((op: any) => op.insert).join(''); // Join all inserts in case there are multiple
            if (realComments.trim() !== "") topLevelFields.comments = realComments;
        }

        // Conditionally add synopsis
        if (report.synopsis && report.synopsis.trim() !== "") {
            topLevelFields.synopsis = report.synopsis;
        }

        // Conditionally add requirements
        if (report.requirements && report.requirements.trim() !== "") {
            topLevelFields.requirements = report.requirements;
        }

        // Push the top-level fields object if it contains any fields
        if (Object.keys(topLevelFields).length > 0) {
            stixViewFinalJson.push(topLevelFields);
        }

        for (let sourceId of sourceIdArray) {
            const source = await Source.findOne({ id: sourceId });
            if (source && source.enabled === false) continue;
            const investigation = await Investigation.findOne({ derivedFromSourceId: sourceId });

            if (source && investigation) {
                const combinedObject: any = {};

                if (source.authorFirst) combinedObject.authorFirst = source.authorFirst;
                if (source.authorLast) combinedObject.authorLast = source.authorLast;
                if (source.year) combinedObject.year = source.year;
                if (source.publishedTitle) combinedObject.publishedTitle = source.publishedTitle;
                if (source.placement) combinedObject.placement = source.placement;
                if (source.city) combinedObject.city = source.city;
                if (source.publisher) combinedObject.publisher = source.publisher;

                // stixData properties after report properties for aesthetics
                const stixData = investigation.stix.find(stix => stix.versionId === investigation.currentStixVersionId)?.data;
                if (stixData) {
                    if (
                        combinedObject.authorFirst ||
                        combinedObject.authorLast ||
                        combinedObject.year ||
                        combinedObject.publishedTitle ||
                        combinedObject.placement ||
                        combinedObject.city ||
                        combinedObject.publisher
                    ) {
                        stixData.bibliography = combinedObject;
                    }
                    stixViewFinalJson.push(stixData);
                }
            }
        }

        return res.status(200).json(stixViewFinalJson);
    }
    catch (error) {
        res.status(500).send(error);
    }
};

export const getCurrentReportText = async (req: Request, res: Response) => {
    try {
        const report = await Report.findOne({ id: req.params.id });
        if (!report) {
            return res.status(404).send('Report not found.');
        }


        // If currentTextVersionId is 0 or undefined, return current version
        if (!report.currentTextVersionId || report.currentTextVersionId === 0) {
            // Return the current report version field
            const reportText = report.version ? JSON.parse(report.version) : null;
            return res.status(200).json(reportText);
        }

        // For versioned content, find the version record and get its textVersion
        const versionRecord = report.versionRecords.find(v => v.version === report.currentTextVersionId);
        if (!versionRecord) {
            return res.status(404).send('Version record not found.');
        }


        // Look up the actual content using the textVersion index
        const reportText = report.generatedReports[versionRecord.textVersion]?.data?.article;
        
        return res.status(200).json(reportText);
    } catch (error) {
        console.error('Error in getCurrentReportText:', error);
        res.status(500).send('Internal server error.');
    }
};

/*
 * We first check to see if the report settings determines which type of model we should use. We otherwise fallback to what the backend .env says
 */
export const callLlmForReportSummary = async (req: Request, res: Response) => {
    const USE_REMOTE_LLM_SERVICE: boolean = process.env.USE_REMOTE_LLM_SERVICE === 'true';
    const reportId = parseInt(req.params.id);
    
    try {
        const report = await Report.findOne({ id: reportId });
        if (!report) {
            return res.status(404).send('Report not found.');
        }
        const sourceList: string[] = report.sourceList
        if (!report.sourceList || sourceList.length === 0) {
            return res.status(204).send('No sources to analyze.');
        }

        // Check if there's already a running job for this report
        const existingJob = await JobStatus.findOne({ reportId });
        if (existingJob && (existingJob.status === 'started' || existingJob.status === 'running')) {
            return res.status(409).json({ message: 'A job is already running for this report' });
        }

        // Create or update job status to 'started'
        await JobStatus.findOneAndUpdate(
            { reportId },
            { 
                reportId,
                status: 'started',
                startTime: new Date(),
                $unset: { endTime: "", error: "" }
            },
            { upsert: true, new: true }
        );

        // Update status to 'running'
        await JobStatus.findOneAndUpdate(
            { reportId },
            { status: 'running' }
        );

        //LLM call is determined by the settings
        const llmUri = report.settings.llmUri;

        let reportText;
        if (llmUri === 'mistralai/Mistral-Nemo-Instruct-2407') {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the header
            if (!token) {
                await JobStatus.findOneAndUpdate(
                    { reportId },
                    { status: 'failed', error: 'Unauthorized', endTime: new Date() }
                );
                return res.status(401).json({ message: "Unauthorized" });
            }

            const apiKey = await validateUserApiKeyForLlm(token);
            if (!apiKey) {
                await JobStatus.findOneAndUpdate(
                    { reportId },
                    { status: 'failed', error: 'Unauthorized: Missing or invalid API Key', endTime: new Date() }
                );
                return res.status(401).json({ message: "Unauthorized: Missing or invalid API Key" });
            }
            reportText = await callRemoteLlmApiForReportSummary(report, apiKey);
        }
        else if (llmUri === 'facebook/bart-large-cnn') {
            reportText = await callLocalSummarizer(report);
        }
        else if (USE_REMOTE_LLM_SERVICE) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Extract the token from the header
            if (!token) {
                await JobStatus.findOneAndUpdate(
                    { reportId },
                    { status: 'failed', error: 'Unauthorized', endTime: new Date() }
                );
                return res.status(401).json({ message: "Unauthorized" });
            }

            const apiKey = await validateUserApiKeyForLlm(token);
            if (!apiKey) {
                await JobStatus.findOneAndUpdate(
                    { reportId },
                    { status: 'failed', error: 'Unauthorized: Missing or invalid API Key', endTime: new Date() }
                );
                return res.status(401).json({ message: "Unauthorized: Missing or invalid API Key" });
            }
            reportText = await callRemoteLlmApiForReportSummary(report, apiKey);
        }
        else {
            reportText = await callLocalSummarizer(report);
        }

        // Mark job as completed
        await JobStatus.findOneAndUpdate(
            { reportId },
            { status: 'completed', endTime: new Date() }
        );

        return res.status(200).json({ llmText: reportText });

    } catch (error) {
        console.log(error);
        // Mark job as failed
        await JobStatus.findOneAndUpdate(
            { reportId },
            { status: 'failed', error: (error as Error)?.message || 'Internal server error', endTime: new Date() }
        );
        return res.status(500).send('Internal server error.');
    }
 };

export const getAceReport = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const report = await Report.findOne({ id: id });
  
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
  
      res.status(200).json(report.aceReport);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
 };

 export const createReportByUser = async (req: Request, res: Response) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user._id;

        const report = new Report(req.body);
        await report.save();

        const permission = new Permissions({
            userId: userId,
            reportId: report._id,
            access: 'report_admin', 
            grantedBy: userId
        });
        await permission.save();

        res.status(201).send(report);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const getReportsForUser = async (req: Request, res: Response) => {
    try {

         if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user._id;
        
        const permissions = await Permissions.find({ userId: userId, access: 'read' });
        const reportIds = permissions.map(permission => permission.reportId);
        
        // Fetch the reports based on the report IDs
        const reports = await Report.find({ _id: { $in: reportIds } });
        
        res.status(200).send(reports);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateReportSettings = async (req: Request, res: Response) => {
    const reportId = req.params.id;
    const { nerUri, llmUri, useRemoteNer, useRemoteLlm } = req.body;

    try {
        const report = await Report.findOne({ id: reportId });

        if (!report) {
            return res.status(404).json({ message: 'Report not found'});
        }

        if (nerUri !== undefined) report.settings.nerUri = nerUri;
        if (llmUri !== undefined) report.settings.llmUri = llmUri;
        if (useRemoteNer !== undefined) report.settings.useRemoteNer = useRemoteNer;
        if (useRemoteLlm !== undefined) report.settings.useRemoteLlm = useRemoteLlm;

        await report.save();

        res.status(200).json(report);

    } catch (error) {
        res.status(500).json({ message: 'Error updating report settings', error})
    }
};

export const updateReportPrompts = async (req: Request, res: Response) => {
    try {
        const reportId = req.params.id;
        const { llmSystemPrompt, llmUserPrompt, dataToLLM } = req.body;

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).send({ message: 'Report not found' });
        }

        if (llmSystemPrompt !== undefined) {
            report.llmSystemPrompt = `${llmSystemPrompt} ${dataToLLM}`;
        }

        if (llmUserPrompt !== undefined) {
            report.llmUserPrompt = `${llmUserPrompt} ${dataToLLM}`;
        }

        await report.save();
        res.status(200).send(report);
    } catch (error) {
        console.error(error);
        res.status(400).send(error);
    }
};

export const getJobStatus = async (req: Request, res: Response) => {
    try {
        const reportId = parseInt(req.params.id);
        const jobStatus = await JobStatus.findOne({ reportId });
        
        if (!jobStatus) {
            return res.status(404).json({ message: 'No job found for this report' });
        }
        
        res.status(200).json(jobStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving job status', error });
    }
};

export const updateJobStatus = async (req: Request, res: Response) => {
    try {
        const reportId = parseInt(req.params.id);
        const { status, error } = req.body;
        
        const updateData: any = { status };
        if (status === 'completed' || status === 'failed') {
            updateData.endTime = new Date();
        }
        if (error) {
            updateData.error = error;
        }
        
        const jobStatus = await JobStatus.findOneAndUpdate(
            { reportId },
            updateData,
            { new: true, upsert: false }
        );
        
        if (!jobStatus) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        res.status(200).json(jobStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error updating job status', error });
    }
};

export const killJob = async (req: Request, res: Response) => {
    try {
        const reportId = parseInt(req.params.id);
        
        // Update job status to 'failed' with killed message
        const jobStatus = await JobStatus.findOneAndUpdate(
            { reportId },
            { 
                status: 'failed', 
                error: 'Job killed by user',
                endTime: new Date()
            },
            { new: true }
        );
        
        if (!jobStatus) {
            return res.status(404).json({ success: false, message: 'No running job found for this report' });
        }
        
        res.status(200).json({ success: true, message: 'Job killed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error killing job', error });
    }
};