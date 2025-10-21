// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import axios from "axios";
import { AppReport, Source } from '../../app/types/types'; // Import the Report type

export class Client {

    async submitInvestigation(outboundReport: AppReport) {
        try {
            const response = await axios.post('http://localhost:3001/investigations', outboundReport )
            console.log(response.data);
            return response.data;
        }
        catch (error) {
            console.error('Server data fetch error: ', error);
        }
    };

    async submitSource(outboundSource: Source) {
        try {
            const response = await axios.post('http://localhost:3001/sources', outboundSource )
            console.log(response.data);
            return response.data;
        }
        catch (error) {
            console.error('Server data fetch error: ', error);
        }
    };

    async addSourceToInvestigation(investigationId: number, sourceId: number) {
        try {
            const response = await axios.put(`http://localhost:3001/investigations/addsource/${investigationId}/${sourceId}`)
            console.log(response.data);
            return response.data;
        }
        catch (error) {
            console.error('Add source error: ', error);
        }
    }

  };
