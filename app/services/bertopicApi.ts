// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Separate API slice for BERTopic microservice
export const bertopicApi = createApi({
  reducerPath: 'bertopicApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:8003',
    prepareHeaders: (headers, { getState }) => {
      console.log('BERTopic API call being made at:', new Date().toISOString());
      return headers;
    },
  }),
  tagTypes: ['BertopicTraining', 'BertopicModel', 'BertopicData'],
  endpoints: (builder) => ({
    trainBertopicModel: builder.mutation<{ message: string }, { startDate: string, endDate: string, recollect?: boolean, bestModelPath?: string, modelType?: 'simple' | 'complex' }>({
      query: ({ startDate, endDate, recollect, bestModelPath, modelType }) => ({
        url: '/model/train-bertopic',
        method: 'POST',
        params: { start_date: startDate, end_date: endDate, recollect, best_model_path: bestModelPath, model_type: modelType },
      }),
      invalidatesTags: ['BertopicTraining', 'BertopicModel', 'BertopicData'],
    }),
    
    getBertopicTrainingStatus: builder.query<{ 
      status: string, 
      start_time: string | null, 
      end_time: string | null, 
      message: string,
      training_type?: string,
      bertopic_step?: string,
      documents_loaded?: number,
      topics_generated?: number,
      elapsed_time?: {
        formatted: string,
        seconds: number
      }
    }, void>({
      query: () => {
        console.log('🔍 BERTopic status query called at:', new Date().toISOString());
        return {
          url: '/model/training-status',
          method: 'GET',
        };
      },
      keepUnusedDataFor: 0, // Don't cache training status
      transformResponse: (response: any, meta, arg) => {
        console.log('📥 BERTopic status response:', response, 'at:', new Date().toISOString());
        return response;
      },
    }),

    // Topic Information and Visualization Endpoints
    getTopicInfo: builder.query<Array<{ 
      Topic: number, 
      Count: number, 
      Name: string, 
      CustomName: string,
      Representation?: string[],
      llm?: string[]
    }>, void>({
      query: () => ({
        url: '/model/topic-info',
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    getTopicNames: builder.query<string[], void>({
      query: () => ({
        url: '/model/topic-names',
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    findTopics: builder.mutation<Array<{ topic_id: number, name: string, similarity_score: number }>, { searchTerm: string, topN?: number }>({
      query: ({ searchTerm, topN = 5 }) => ({
        url: '/model/find-topics',
        method: 'POST',
        body: { search_term: searchTerm, top_n: topN },
      }),
    }),

    getTopicDocuments: builder.query<{ topic_id: number, rss_article_ids: string[], total_documents: number }, number>({
      query: (topicId) => ({
        url: `/model/get-topic-documents?topic_id=${topicId}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    // Visualization Endpoints - Return Plotly JSON
    getHierarchyVisualization: builder.query<any, { topN?: number }>({
      query: ({ topN }) => ({
        url: `/model/visualize-hierarchy${topN ? `?top_n_topics=${topN}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    getBarchartVisualization: builder.query<any, { topN?: number }>({
      query: ({ topN }) => ({
        url: `/model/visualize-barchart${topN ? `?top_n_topics=${topN}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    getHeatmapVisualization: builder.query<any, { topN?: number }>({
      query: ({ topN }) => ({
        url: `/model/visualize-heatmap${topN ? `?top_n_topics=${topN}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    getTopicsOverTimeVisualization: builder.query<any, { topN?: number }>({
      query: ({ topN }) => ({
        url: `/model/visualize-topics-over-time${topN ? `?top_n_topics=${topN}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    getIntertopicDistanceVisualization: builder.query<any, { topN?: number }>({
      query: ({ topN }) => ({
        url: `/model/visualize-intertopic-distance${topN ? `?top_n_topics=${topN}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['BertopicData'],
    }),

    // Model Management Endpoints
    getAvailableModels: builder.query<{ models: Array<{ 
      name: string, 
      path: string, 
      created_at: string, 
      modified_at: string, 
      is_current: boolean, 
      num_topics?: number, 
      total_documents?: number,
      training_config?: {
        start_date: string,
        end_date: string,
        date_range_days: number
      },
      avg_document_length?: number,
      documents_per_topic?: number,
      creation_source?: string
    }> }, void>({
      query: () => ({
        url: '/model/list-models',
        method: 'GET',
      }),
      providesTags: ['BertopicModel'],
    }),

    getCurrentModel: builder.query<{ current_model: string | null, path: string | null, loaded: boolean }, void>({
      query: () => ({
        url: '/model/current-model',
        method: 'GET',
      }),
      providesTags: ['BertopicModel'],
    }),

    getModelMetadata: builder.query<{
      created_at: string,
      model_version?: string,
      bertopic_version?: string,
      num_topics?: number,
      num_documents?: number,
      training_type?: string,
      training_info?: {
        date_range: {
          start: string,
          end: string
        },
        training_type: string,
        document_count: number,
        topic_count: number
      },
      parameters?: any,
      files?: any
    }, void>({
      query: () => ({
        url: '/model/metadata',
        method: 'GET',
      }),
      providesTags: ['BertopicModel'],
    }),

    switchModel: builder.mutation<{ message: string, model_name: string }, { modelName: string }>({
      query: ({ modelName }) => ({
        url: `/model/switch?model_name=${modelName}`,
        method: 'POST',
      }),
      invalidatesTags: ['BertopicModel', 'BertopicData'],
    }),

    deleteModel: builder.mutation<{ message: string, model_name: string, unloaded_current: boolean }, { modelName: string }>({
      query: ({ modelName }) => ({
        url: `/model/delete?model_name=${modelName}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BertopicModel', 'BertopicData'],
    }),

    clearModel: builder.mutation<{ message: string, previous_model: string, was_loaded: boolean }, void>({
      query: () => ({
        url: '/model/clear',
        method: 'POST',
      }),
      invalidatesTags: ['BertopicModel', 'BertopicData'],
    }),
  }),
});

export const {
  useTrainBertopicModelMutation,
  useGetBertopicTrainingStatusQuery,
  useLazyGetBertopicTrainingStatusQuery,
  
  // Topic Information hooks
  useGetTopicInfoQuery,
  useGetTopicNamesQuery,
  useFindTopicsMutation,
  useGetTopicDocumentsQuery,
  
  // Visualization hooks
  useGetHierarchyVisualizationQuery,
  useGetBarchartVisualizationQuery,
  useGetHeatmapVisualizationQuery,
  useGetTopicsOverTimeVisualizationQuery,
  useGetIntertopicDistanceVisualizationQuery,
  
  // Model Management hooks
  useGetAvailableModelsQuery,
  useGetCurrentModelQuery,
  useGetModelMetadataQuery,
  useSwitchModelMutation,
  useDeleteModelMutation,
  useClearModelMutation,
} = bertopicApi;