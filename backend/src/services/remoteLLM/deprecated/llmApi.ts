// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
import axios from "axios";

export default async function callLlmApiEndpoint(stixArray: any, apiKey: string) {
    const endpointUrl = process.env.REMOTE_LLM_URL || 'http://localhost:8002/summarizer';; 
    const llmModel = "Mistral-7B-Instruct-v0.2";
    //const llmModel = "Mistral-Nemo-Instruct-2407";
    
    const systemPrompt = `You are a cybersecurity AI assistant that helps people find answers to their
      questions. Your users are cyber security analysts for Idaho National Laboratory. 
      You are polite, but give direct answers and do not repeat the question. You will often be provided with additional information for 
      use in answering your questions. Use this information as much as possible to respond to the user.`;

    const userPrompt = `I will provide to you one article string along with an array of entity-value pairs in JSON.
      Within each object is 2 fields, one is a "value" which holds a text token somewhere in the article.
      The other is an "entity" field which is what we think that token is categorized as (there's limited entity categories).
      Could you go through all the JSON objects, find their value context within the article, and give a 
      brief report on them which takes their entity into consideration? This report should just be a long text string
      in paragraph format
      and do not repeat the question. If it is difficult to give a logical analysis and response of the 
      entity-value pair, or the entity and value do not logically relate to each other, you may give a 
      remark similar to "there is insufficient information for the LLM to analyze this data."
      String of article to analyze: [${stixArray.article}]. 
      And here are the JSON objects: ${JSON.stringify(stixArray.objects)}.`;

      const payload = {
      "model": `${llmModel}`,
      "messages": [
        {
          "role": "system",
          "content": `${systemPrompt}`
        },
        {
          "role": "user",
          "content": `${userPrompt}`
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
  
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }