// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import bertopicAPIService from '../../app/services/bertopicAPIService';
import axios from 'axios';

interface TopicInfo {
  Topic: number;
  CustomName: string;
  Count: number;
}

const ExampleComponent: React.FC = () => {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        //const response = await bertopicAPIService.getTopicInfo();
        //setTopics(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Topics</h1>
      <ul>
        {topics.map((topic) => (
          <li key={topic.Topic}>
            {topic.CustomName} (Count: {topic.Count})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExampleComponent;