// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
import callLlmApiEndpoint from "./llmApi";
import Report from "../../../models/Report";
import Investigation from "../../../models/Investigation";
import { updateGeneratedReportTextVersion } from "../../../handlers/reportHandler";

async function processStixArray(filteredStix: any, token: string): Promise<any[]> {
    const results: any[] = [];

    // call llm for each individual item and push the result to the return array
    for (let i = 0; i < filteredStix.length; i++) {
        const result = await callLlmApiEndpoint(filteredStix[i], token);
        results.push(result);
    }
    return results;
}
/***** 
 * Stream data is return from the LLM in the form of a stringified array of JSON objects
 * that resemble the following:
 * data: {"choices": [{"delta": {"content": " is categor", "role": null}, "finish_reason": null, "index": 0}], "created": 1740090425, "id": "chatcmpl-cEhbwMLmt2cgzEsiW8sD2e", "model": "Mistral-7B-Instruct-v0.2", "object": "chat.completion.chunk"}
 * data: {"choices": [{"delta": {"content": "ized as", "role": null}, "finish_reason": null, "index": 0}], "created": 1740090425, "id": "chatcmpl-cEhbwMLmt2cgzEsiW8sD2e", "model": "Mistral-7B-Instruct-v0.2", "object": "chat.completion.chunk"}
 * There is white space between each object but note it is a string not an array.
 * We split at data, turn it into an object, access the content field, and concatenate results.
*****/
async function processStreamedResults(results: any[]): Promise<string> {
    let count = 1;
    let resultsMessage: string = "";

    for (let result of results) {
        resultsMessage += `Large language model analysis of enabled article ${count++}:\n`;
        // split strings at word data
        let jsonStrings = result.split('data: ');

        for (let jsonString of jsonStrings) {
            jsonString = jsonString.trim(); // Remove whitespace

            if (jsonString === '[DONE]') {
                break; // data: [DONE] is sent at stream end
            }

            if (jsonString) { // if the string is not empty...
                try {
                    let dataObject = JSON.parse(jsonString);

                    // ...concatenate content field to resultsMessage if not null
                    if (dataObject.choices && dataObject.choices[0] && dataObject.choices[0].delta && dataObject.choices[0].delta.content) {
                        resultsMessage += dataObject.choices[0].delta.content;
                    }
                } catch (e) {
                    console.error("Failed to parse JSON string:", jsonString, e);
                }
            }
        }
        resultsMessage += '\n\n\n\n\n';
    }
    return resultsMessage;
};

export default async function llmApiCaller (reportId: string, token: string) {
    console.log('Calling LLM Model...');
    try {
            // Find the report by ID
            const report = await Report.findOne({ id: reportId });
            if (!report) { 
                throw new Error('Report not found');
            }
            const sourceList = report.sourceList;
            // Find unique investigation objects by the custom id field
            const investigations = await Investigation.find({
                derivedFromSourceId: { $in: sourceList },
                enabled: true
              });

            // filter each results object
            const filteredStix = investigations.map(investigation => {
                const stixVersionId = investigation.currentStixVersionId;
                const stixObject = investigation.stix[stixVersionId];
                if (!stixObject || !stixObject.data) {
                    return null;
                }

                const article = stixObject.data.article;
                const objects = stixObject.data.objects;
                if (!article || !objects || objects.length === 0) {
                    return null;
                }

                const filteredObjects = objects.filter((obj: any) => obj.entity || obj.type);

                return {
                    //id: investigation.derivedFromSourceId,
                    article,
                    objects: filteredObjects.map((obj: any) => ({
                        entity: obj.entity || obj.type,
                        value: obj.value || obj.name
                    }))
                };
            }).filter(investigation => investigation != null);

            const results = await processStixArray(filteredStix, token);
            let resultsMessage;
            //get promise from processed results
            await processStreamedResults(results)
            .then((message) => {
                resultsMessage = message;
                return updateGeneratedReportTextVersion(reportId, message);
            });
            console.log('LLM Model Successfully Returned.')
            return resultsMessage;
    } 
    catch (error) {
        throw error;
    }
};
