// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
import axios from "axios";
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

async function callLocalSummarizer(report: any) {
    console.log('Performing full report analysis on local summarizer...')
    const dataToLLM = await getReportData(report);
    
    const LOCAL_LLM_SERVICE_URL: string = process.env.LOCAL_LLM_SERVICE_URL || 'http://localhost:8002/summarizer';
    
    const userPrompt = `${dataToLLM}.`;

    const payload = {
      "text": `${userPrompt}`
    };

    try {
      const response = await axios.post(LOCAL_LLM_SERVICE_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      updateGeneratedReportTextVersion(report.id, response.data.summary);
      console.log('Finished full report analysis.')
      return response.data.summary;
    } 
    catch (error) {
        console.error(error);
        throw error;
    }
  }
   export default callLocalSummarizer;