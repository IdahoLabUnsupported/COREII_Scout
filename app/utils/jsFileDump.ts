// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Should mostly always have -title at the end but re-validate just in case
function getScoutReportTitle( title?: string ): string {
    // Check if the title exists and contains visible human-readable alphanumeric characters
    if (title && /[a-zA-Z0-9]/.test(title)) {
        return `ScoutReport-${title}`;
    } else {
        return 'ScoutReport';
    }
}

export const jsFileDump = async (mainReportInfo: any, filteredSources: any) => {
  try {
    // Create a new JSZip instance
    const zip = new JSZip();
    const zipTitle = getScoutReportTitle(mainReportInfo.title);

    // Add the report data to the zip file in the 'reports' folder
    const reportsFolder = zip.folder(zipTitle);
    if (reportsFolder) {
      reportsFolder.file('MainReport.json', JSON.stringify(mainReportInfo, null, 2));
      reportsFolder.file('ReportSources.json', JSON.stringify(filteredSources, null, 2));
    }

    // Generate the zip file and trigger the download
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${zipTitle}.zip`);
  } catch (error) {
    console.error('Error downloading the reports:', error);
  }
};
