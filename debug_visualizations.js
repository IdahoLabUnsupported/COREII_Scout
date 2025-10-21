// Debug script to test BERTopic visualization endpoints
// Run this in your browser console or as a standalone script

const BASE_URL = 'http://localhost:8003';

async function testEndpoints() {
  console.log('🔍 Testing BERTopic API endpoints...');
  
  const endpoints = [
    '/model/current-model',
    '/model/topic-info',
    '/model/visualize-barchart?top_n_topics=5',
    '/model/visualize-hierarchy?top_n_topics=5',
    '/model/visualize-heatmap?top_n_topics=5',
    '/model/visualize-topics-over-time?top_n_topics=5',
    '/model/visualize-intertopic-distance?top_n_topics=5'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${BASE_URL}${endpoint}`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        console.error(`❌ ${endpoint} failed:`, response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        continue;
      }
      
      const data = await response.json();
      
      if (endpoint.includes('visualize-')) {
        // Check if it's valid Plotly data
        if (data.data && Array.isArray(data.data) && data.layout) {
          console.log(`✅ ${endpoint} returned valid Plotly data:`, {
            traces: data.data.length,
            hasLayout: !!data.layout,
            layoutKeys: Object.keys(data.layout)
          });
        } else {
          console.warn(`⚠️ ${endpoint} returned unexpected format:`, Object.keys(data));
        }
      } else {
        console.log(`✅ ${endpoint} returned:`, data);
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint} failed with error:`, error.message);
    }
  }
}

// Run the test
testEndpoints();