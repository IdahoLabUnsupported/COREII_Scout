// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
import axios from "axios";
import https from 'https';
import Investigation from "../../models/Investigation";
import Source from "../../models/Source";
import { updateGeneratedReportTextVersion } from "../../handlers/reportHandler";

const getReportData = async (report: any) => {
  try {
    const sourceList = report.sourceList;
    // Find unique investigation objects by the custom id field
    const investigations = await Investigation.find({
        derivedFromSourceId: { $in: sourceList },
        enabled: true
      });

      const finalArray = [];

      // If report.comments exists, add it as the first element of the final array
      if (report.comments) {
        const parsedComments = JSON.parse(report.comments); // Comment in form {"ops":[{"insert":"real comment here"}]}
          const realComments = parsedComments.ops.map((op: any) => op.insert).join(''); // Join all inserts in case there are multiple
          if (realComments.trim() !== "") finalArray.push({comments: realComments});
      }
    // filter each results object
    const filteredStixPromises = investigations.map(async (investigation) => {
      const stixVersionId = investigation.currentStixVersionId;
      const stixObject = investigation.stix[stixVersionId];
      if (!stixObject || !stixObject.data) {
          return null;
      }
  
      const article = stixObject.data.article;
      let bibliography;
      if (!article) {
        return null;
      }

      const combinedObject: any = {};
      const source = await Source.findOne({ id: investigation.derivedFromSourceId });
      if (source && source.enabled === true) { // good practice but should be handled by above investigation enable check
        
        if (source.authorFirst) combinedObject.authorFirst = source.authorFirst;
        if (source.authorLast) combinedObject.authorLast = source.authorLast;
        if (source.year) combinedObject.year = source.year;
        if (source.publishedTitle) combinedObject.publishedTitle = source.publishedTitle;
        if (source.placement) combinedObject.placement = source.placement;
        if (source.city) combinedObject.city = source.city;
        if (source.publisher) combinedObject.publisher = source.publisher;

        if (
            combinedObject.authorFirst ||
            combinedObject.authorLast ||
            combinedObject.year ||
            combinedObject.publishedTitle ||
            combinedObject.placement ||
            combinedObject.city ||
            combinedObject.publisher
        ) {
            bibliography = combinedObject;
        }
      }
      
      /*commented out 03/27/2025 per project's request to not send entities
      const objects = stixObject.data.objects;
      if (!article || !objects || objects.length === 0) {
          return null;
      }
      const filteredObjects = objects.filter((obj: any) => obj.entity || obj.type); */
  
      const result: any = {
          //id: investigation.derivedFromSourceId,
          article,
          /*commented out 03/27/2025 per project's request to not send entities
          objects: filteredObjects.map((obj: any) => JSON.stringify({ // note here objects are always stringified for the llm
              entity: obj.entity || obj.type,
              value: obj.value || obj.name
          }))*/
      };
      if (bibliography) {
        result.bibliography = bibliography;
      }
      return result;
    });   
    // Wait for all promises to resolve (async investigations) and filter out any null results
    const filteredStix = await Promise.all(filteredStixPromises);
    const filteredResults = filteredStix.filter(investigation => investigation != null);
    finalArray.push(...filteredResults);
    return JSON.stringify(finalArray);
  }
  catch (error) {
    throw error;
  }
};

/***** 
 * Stream data is return from the LLM in the form of a stringified array of JSON objects
 * that resemble the following:
 * data: {"choices": [{"delta": {"content": " is categor", "role": null}, "finish_reason": null, "index": 0}], "created": 1740090425, "id": "chatcmpl-cEhbwMLmt2cgzEsiW8sD2e", "model": "Mistral-7B-Instruct-v0.2", "object": "chat.completion.chunk"}
 * data: {"choices": [{"delta": {"content": "ized as", "role": null}, "finish_reason": null, "index": 0}], "created": 1740090425, "id": "chatcmpl-cEhbwMLmt2cgzEsiW8sD2e", "model": "Mistral-7B-Instruct-v0.2", "object": "chat.completion.chunk"}
 * There is white space between each object but note it is a string not an array.
 * We split at data, turn it into an object, access the content field, and concatenate results.
*****/
function extractFinalContent(rawContent: string): string {
  // Look for "assistantfinal" pattern and extract content after it
  const finalMatch = rawContent.match(/assistantfinal(.*?)$/s);
  if (finalMatch) {
    return finalMatch[1].trim();
  }
  
  // Fallback: look for content after "final" keyword
  const fallbackMatch = rawContent.match(/final(.*?)$/s);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }
  
  // If no pattern found, return original content
  return rawContent.trim();
}

function convertMarkdownToQuillDelta(content: string): string {
  const lines = content.split('\n');
  const ops: any[] = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line) {
      // Empty line - end table if we were in one
      if (inTable) {
        inTable = false;
      }
      ops.push({ insert: '\n' });
      continue;
    }
    
    // Check if this is a table line (starts and ends with |)
    if (line.startsWith('|') && line.endsWith('|')) {
      // Check if next line is a separator (|---|---|)
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const isSeparator = /^\|[\s\-\|]*\|$/.test(nextLine);
      
      if (!inTable && isSeparator) {
        // Starting a new table - convert to formatted list
        inTable = true;
        i++; // Skip the separator line
        
        // Add table header as bold text
        ops.push({ insert: 'Table:', attributes: { bold: true } });
        ops.push({ insert: '\n' });
      }
      
      if (inTable) {
        // Parse table row and convert to list item
        const cells = line.split('|').slice(1, -1); // Remove empty first/last elements
        const rowText = cells.map(cell => cell.trim()).join(' | ');
        ops.push({ insert: '• ' });
        processTextWithFormatting(rowText, ops);
        ops.push({ insert: '\n' });
        continue;
      }
    } else {
      // Not a table line - end table if we were in one
      if (inTable) {
        inTable = false;
        ops.push({ insert: '\n' }); // Add spacing after table
      }
    }
    
    // Handle headings
    if (line.startsWith('### ')) {
      const text = line.substring(4);
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { header: 3 } });
    } else if (line.startsWith('## ')) {
      const text = line.substring(3);
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { header: 2 } });
    } else if (line.startsWith('# ')) {
      const text = line.substring(2);
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { header: 1 } });
    } else if (line.startsWith('> ')) {
      // Handle blockquotes
      const text = line.substring(2);
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { blockquote: true } });
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      // Handle bullet lists
      const text = line.substring(2);
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { list: 'bullet' } });
    } else if (/^\d+\.\s/.test(line)) {
      // Handle numbered lists
      const text = line.replace(/^\d+\.\s/, '');
      processTextWithFormatting(text, ops);
      ops.push({ insert: '\n', attributes: { list: 'ordered' } });
    } else if (line === '---') {
      // Handle horizontal rules as plain text
      ops.push({ insert: '---' });
      ops.push({ insert: '\n' });
    } else {
      // Handle regular text with formatting
      processTextWithFormatting(line, ops);
      ops.push({ insert: '\n' });
    }
  }
  
  // Return as Delta JSON string for database storage
  return JSON.stringify({ ops });
}

function processTextWithFormatting(text: string, ops: any[]) {
  // Handle bold (**text**), italic (*text*), and other inline formatting
  let remaining = text;
  let lastIndex = 0;
  
  // Combined regex for bold, italic, and code
  const formatRegex = /(\*\*(.*?)\*\*)|(\*(.*?)\*)|(`(.*?)`)/g;
  let match;
  
  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before formatting
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) ops.push({ insert: beforeText });
    }
    
    if (match[1]) {
      // Bold text (**text**)
      ops.push({ insert: match[2], attributes: { bold: true } });
    } else if (match[3]) {
      // Italic text (*text*)
      ops.push({ insert: match[4], attributes: { italic: true } });
    } else if (match[5]) {
      // Code text (`text`)
      ops.push({ insert: match[6], attributes: { code: true } });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) ops.push({ insert: remainingText });
  }
}

async function processStreamedResults(result: string): Promise<string> {
  let resultsMessage: string = "";

    // split string at word data
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
  
  // Extract final content and convert formatting
  const extractedContent = extractFinalContent(resultsMessage);
  const formattedContent = convertMarkdownToQuillDelta(extractedContent);
  
  return formattedContent;
};

async function callRemoteLlmApiForReportSummary(report: any, apiKey: string | undefined) {
    console.log('Performing full report analysis...')
    const dataToLLM = await getReportData(report);
    const endpointUrl = process.env.REMOTE_LLM_URL || 'http://localhost:8002/summarizer';
    const llmModel = process.env.REMOTE_SERVER_MODEL_ID || "Mistral-Nemo-Instruct-2407";
    
    const systemPrompt = `You are a cybersecurity AI assistant that helps people find answers to their
      questions. Your users are cyber security analysts for Idaho National Laboratory. 
      You are polite, but give direct answers and do not repeat the question. You will often be provided
      with additional information for use in answering your questions. Use this information as much as 
      possible to respond to the user.`;

      const userPrompt = `I will provide to you first an optional comments field including analyst comments 
      pertaining to the subsequent objects that will also be sent in. These objects are a number of news like
      articles ranging from 1 or more with each article also having an optional bibliography. This will be in 
      an array where the comments, if they exist, will come first, then the rest will be articles and their 
      optional bibliography which may or may not be complete will follow. Could you go through all the articles
      and give a brief report which takes the report comments and optionally the article bibliography into 
      consideration? This report should just be a long text string in paragraph format. 
      Do not repeat this question. 
      Based on your own knowledge, and the articles provided: Write a recommendation report.
      This should be no more than: 1000 words long. 
      Written in the tone of: Cybersecurity Analyst. 
      Written by: Prompt muse. 
      Target Demographic is: 50-60 year old, cybersecurity executives.
      The article should flow well, start with a catchy introduction/hook, and end in a compelling, and 
      thought-provoking conclusion/outro, and contain mitigations to issues.
      Add a couple of sub-headings, but ONLY where appropriate - not too many. 
      Try to be unbiased and view different perspectives. 
      Create a catchy headline/title which would intrigue the reader.
      Given known cybersecurity keywords, add as many cluster Keywords around cybersecurity keywords, as 
      you can within the article, and use a variety of Synonyms where applicable.
      Areas to cover: Impact, Mitigations, Exposure, References
      ADD a DISCLAIMER that this report was written by a AI Language model with 'INL Inside'."
      Here are the comments and articles to analyze: `;

      const payload = {
      "model": `${llmModel}`,
      "messages": [
        {
          "role": "system",
          "content": report.llmSystemPrompt ? report.llmSystemPrompt : `${systemPrompt}`
        },
        {
          "role": "user",
          "content": report.llmUserPrompt ? `${report.llmUserPrompt} ${dataToLLM}` : `${userPrompt} ${dataToLLM}`
        },
      ],
      "max_tokens": 32000,
      "stream": true,
      "user": "Analyst",
    };


    try {
      const response = await axios.post(endpointUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });
  
      const finalReport = processStreamedResults(response.data);
      updateGeneratedReportTextVersion(report.id, finalReport);
      console.log('Finished full report analysis.')
      return finalReport;
    } 
    catch (error) {
        throw error;
    }
  }
   export default callRemoteLlmApiForReportSummary;
