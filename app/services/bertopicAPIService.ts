// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:8003'; // FastAPI server

interface LoadModelResponse {
  message: string;
}

interface TrainModelResponse {
  message: string;
}

interface TrainingStatus {
  status: string;
  start_time: string | null;
  end_time: string | null;
  message: string;
}

interface TopicInfo {
  Topic: number;
  CustomName: string;
  Count: number;
}

interface FindTopicsRequest {
  search_term: string;
  top_n: number;
}

interface FindTopicsResponse {
  topic_id: number;
  name: string;
  similarity_score: number;
}

interface PredictRequest {
  documents: string[];
}

interface PredictResponse {
  topics: string[];
  probabilities?: number[][];
}

interface TopicDocumentsResponse {
  topic_name: string;
  documents: string[];
}

interface VisualizationResponse {
  data: object;
}

const bertopicAPIService = {
  loadModel: (modelPath?: string): Promise<AxiosResponse<LoadModelResponse>> => {
    return axios.post(`${API_BASE_URL}/model/load`, null, {
      params: { model_path: modelPath },
    });
  },
  trainModel: (
    startDate: string,
    endDate: string,
    recollect?: boolean,
    bestModelPath?: string
  ): Promise<AxiosResponse<TrainModelResponse>> => {
    return axios.post(`${API_BASE_URL}/model/train-bertopic`, null, {
      params: { start_date: startDate, end_date: endDate, recollect, best_model_path: bestModelPath },
    });
  },
  getTrainingStatus: (): Promise<AxiosResponse<TrainingStatus>> => {
    return axios.get(`${API_BASE_URL}/model/training-status`);
  },
  
  getTopicInfo: (): Promise<AxiosResponse<TopicInfo[]>> => {
    return axios.get(`${API_BASE_URL}/model/topic-info`);
  },
  getTopicNames: (): Promise<AxiosResponse<string[]>> => {
    return axios.get(`${API_BASE_URL}/model/topic-names`);
  },
  findTopics: (request: FindTopicsRequest): Promise<AxiosResponse<FindTopicsResponse[]>> => {
    return axios.post(`${API_BASE_URL}/model/find-topics`, request);
  },
  predictTopics: (request: PredictRequest): Promise<AxiosResponse<PredictResponse>> => {
    return axios.post(`${API_BASE_URL}/model/predict-topic`, request);
  },
  getTopicDocuments: (topicName: string): Promise<AxiosResponse<TopicDocumentsResponse>> => {
    return axios.get(`${API_BASE_URL}/model/get-topic-documents`, {
      params: { topic_name: topicName },
    });
  },
  visualizeHierarchy: (topNTopics?: number): Promise<AxiosResponse<VisualizationResponse>> => {
    return axios.get(`${API_BASE_URL}/model/visualize-hierarchy`, {
      params: { top_n_topics: topNTopics },
    });
  },
  visualizeBarchart: (topNTopics?: number): Promise<AxiosResponse<VisualizationResponse>> => {
    return axios.get(`${API_BASE_URL}/model/visualize-barchart`, {
      params: { top_n_topics: topNTopics },
    });
  },
  visualizeHeatmap: (topNTopics?: number): Promise<AxiosResponse<VisualizationResponse>> => {
    return axios.get(`${API_BASE_URL}/model/visualize-heatmap`, {
      params: { top_n_topics: topNTopics },
    });
  },
  visualizeTopicsOverTime: (topNTopics?: number): Promise<AxiosResponse<VisualizationResponse>> => {
    return axios.get(`${API_BASE_URL}/model/visualize-topics-over-time`, {
      params: { top_n_topics: topNTopics },
    });
  },
};

export default bertopicAPIService;