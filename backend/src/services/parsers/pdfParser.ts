// Copyright 2025 Idaho National Laboratory. All rights reserved.
import pdf from 'pdf-parse';

export default async function parsePDF(pdfFile: Express.Multer.File): Promise<string> {
    try {
        const pdfBuffer = pdfFile.buffer;

        const data = await pdf(pdfBuffer);
        //console.log('Parsed text content:', data.text); // Log parsed text content
        return data.text;
    } catch (error) {
        throw new Error('PDF parsing failed: ' + error);
    }
}
