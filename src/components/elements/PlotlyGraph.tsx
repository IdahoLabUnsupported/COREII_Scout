// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';

// Imports
import Plot from 'react-plotly.js';

type Props = {
  data: any[];
  layout: any;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

const PlotlyGraph: React.FC<Props> = ({
  data,
  layout
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('🎨 PlotlyGraph received props:', {
      hasData: !!data,
      dataLength: Array.isArray(data) ? data.length : 'not array',
      hasLayout: !!layout,
      dataStructure: data ? (Array.isArray(data) ? data.map(d => d.type || 'unknown') : typeof data) : 'no data',
      layoutKeys: layout ? Object.keys(layout) : 'no layout'
    });
  }, [data, layout]);

  const combinedLayout = React.useMemo(() => {
    // Create a deep copy to avoid read-only property issues
    const layoutCopy = JSON.parse(JSON.stringify(layout || {}));
    
    return {
      ...layoutCopy,
      autosize: true,
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      font: {
        family: 'Source Sans Pro, sans-serif',
        color: '#ffffff',
      },
      responsive: true,
      margin: {
        t: 100,
        l: 70,
        b: 20,
        r: 40,
      },
      barmode: layoutCopy.barmode,
      bargap: layoutCopy.bargap,
      shapes: layoutCopy.shapes,
      annotations: layoutCopy.annotations,
      xaxis: { 
        ...layoutCopy.xaxis, 
        autorange: true,
      },
      yaxis: { 
        ...layoutCopy.yaxis, 
        autorange: true,
      },
      yaxis2: { 
        ...layoutCopy.yaxis2, 
        autorange: true,
      },
    };
  }, [layout]);

  // Check for any rendering issues
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('🚨 PlotlyGraph: Invalid data prop', { data });
    return <div className="text-error">No plot data available</div>;
  }

  if (!layout) {
    console.warn('🚨 PlotlyGraph: Missing layout prop');
    return <div className="text-error">No plot layout available</div>;
  }

  // Also deep copy the data to avoid read-only issues
  const safePlotData = React.useMemo(() => {
    try {
      return JSON.parse(JSON.stringify(data || []));
    } catch (error) {
      console.error('Error deep copying plot data:', error);
      return data || [];
    }
  }, [data]);

  return (
    <>
      <Plot
        data={safePlotData}
        layout={combinedLayout}
        useResizeHandler={true}
        className="w-full"
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
          responsive: true
        }}
        onError={(error) => {
          console.error('🚨 Plotly rendering error:', error);
        }}
        onInitialized={(figure, graphDiv) => {
          console.log('✅ Plotly initialized successfully', { figure: !!figure, graphDiv: !!graphDiv });
        }}
        onUpdate={(figure, graphDiv) => {
          console.log('🔄 Plotly updated', { figure: !!figure, graphDiv: !!graphDiv });
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
};

export default PlotlyGraph;
