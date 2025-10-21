// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Request, Response } from 'express';
import Investigation from '../models/Investigation';
import mongoose from 'mongoose';

export const createInvestigation = async (req: Request, res: Response) => {
    try {
        const investigation = new Investigation(req.body);
        await investigation.save()
        res.status(201).send(investigation);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const addInvestigationSource = async (req: Request, res: Response) => {
    try {
        const investigation = await Investigation.findOneAndUpdate( //findOne uses custom front end id as opposed to mongoose _id
        { id: req.params.investigationId },
        { $push: { sourceList: req.params.sourceId } }, // $push appends the sourceId to the sourceList array
        { new: true, runValidators: true } // Returns the updated document and runs validators
      );
       if (!investigation) {
        return res.status(404).send();
       }
        res.status(200).send(investigation);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const updateInvestigation = async (req: Request, res: Response) => {
    try {
        const investigation = await Investigation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!investigation) {
            return res.status(404).send();
        }
        res.status(200).send(investigation);
    } catch (error) {
        res.status(400).send(error);
    }
};

export const getInvestigations = async (req: Request, res: Response) => {
    try {
        const investigations = await Investigation.find();
        res.status(200).send(investigations);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const getInvestigation = async (req: Request, res: Response) => {
    try {
        //const investigation = await Investigation.findById(req.params.id);
        const investigation = await Investigation.findOne({ derivedFromSourceId: req.params.derivedSourceId });
        if (!investigation) {
            return res.status(404).send();
        }
        res.status(200).send(investigation);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const bulkGetInvestigations = async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    try {
        // Find items by their IDs
        const items = await Investigation.find({ derivedFromSourceId: { $in: ids } });
        res.status(200).send(items);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const deleteInvestigation = async (req: Request, res: Response) => {
    try {
        const investigation = await Investigation.findByIdAndDelete(req.params.id);
        if (!investigation) {
            return res.status(404).send();
        }
        res.status(200).send(investigation);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateHighlightRange = async (req: Request, res: Response): Promise<void> => {
  
    try {
      const { updatedRanges, entityText } = req.body; // Extract entityText from the request body
      const derivedFromSourceId = Number(req.params.derivedFromSourceId);
  
      if (isNaN(derivedFromSourceId)) {
        res.status(400).send({ error: 'Invalid derivedFromSourceId' });
        return;
      }
  
      const investigation = await Investigation.findOne({ derivedFromSourceId: derivedFromSourceId });
  
      if (!investigation) {
        res.status(404).send('Investigation not found.');
        return;
      }
  
      if (!Array.isArray(updatedRanges)) {
        res.status(400).send({ error: 'Invalid updatedRanges' });
        return;
      }
  
      // Ensure that predictions exist
      if (!Array.isArray(investigation.predictions)) {
        investigation.predictions = [];
      }
  
      // Track existing highlights' start and end positions
      const existingHighlights = new Set(investigation.predictions.map(highlight => `${highlight.start_pos}-${highlight.end_pos}`));
  
      // Add new highlights if they don't already exist
      updatedRanges.forEach(([start, end]) => {
        const highlightKey = `${start}-${end}`;
        if (!existingHighlights.has(highlightKey)) {
          investigation.predictions.push({
            entity_text: entityText, // Use the extracted entityText
            entity_label: 'None',
            confidence: 1,
            start_pos: start,
            end_pos: end,
            tramStatus: 'review'
          });
        }
      });
  
      investigation.markModified('predictions');
      await investigation.save();
  
      res.status(200).json(investigation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  };
  
  export const deleteHighlightRange = async (req: Request, res: Response) => {

    try {
        const { range } = req.body;
        const { derivedFromSourceId } = req.params;

        // Ensure derivedFromSourceId is a number
        const derivedFromSourceIdNumber = Number(derivedFromSourceId);
        if (isNaN(derivedFromSourceIdNumber)) {
            return res.status(400).send({ error: 'Invalid derivedFromSourceId' });
        }

        // Ensure range is an array of numbers
        if (!Array.isArray(range) || range.length !== 2 || isNaN(range[0]) || isNaN(range[1])) {
            return res.status(400).send({ error: 'Invalid range' });
        }

        const investigation = await Investigation.findOne({ derivedFromSourceId: derivedFromSourceIdNumber });

        if (!investigation) {
            return res.status(404).send('Investigation not found.');
        }

        const [start, end] = range;

        // Ensure that predictions exist
        if (!Array.isArray(investigation.predictions)) {
            investigation.predictions = [];
        }

        // Filter out the prediction with the specified range
        investigation.predictions = investigation.predictions.filter(prediction => {
            return !(prediction.start_pos === start && prediction.end_pos === end);
        });

        investigation.markModified('predictions');
        await investigation.save();

        res.status(200).send({ message: 'Highlight range deleted successfully', investigation });
    } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
            res.status(400).send({ message: 'Invalid data type', error: error.message });
        } else {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).send({ message: 'Failed to delete highlight range', error: errorMessage });
        }
    }
};
  
export const newStixVersion = async (req: Request, res: Response) => {
    try {
        // Find the investigation to get the current array size
        const investigationForArraySize = await Investigation.findOne({ derivedFromSourceId: req.params.derivedSourceId });
        if (!investigationForArraySize) {
            return res.status(404).send({ message: "Investigation not found" });
        }

        // Calculate the new version ID
        const newVersionId = investigationForArraySize.stix.length;

        // Create the new stix version object
        const newStixVersion = {
            versionId: newVersionId,
            date: new Date(),
            data: req.body.newStixVersion // Ensure data is set correctly
        };

        // Update the investigation by pushing the new version to the array and updating currentStixVersionId
        const updatedInvestigation = await Investigation.findOneAndUpdate(
            { derivedFromSourceId: req.params.derivedSourceId },
            {
                $push: { stix: newStixVersion },
                $set: { currentStixVersionId: newVersionId } // Update currentStixVersionId
            },
            { new: true, runValidators: true } // Return updated document
        );

        if (!updatedInvestigation) {
            return res.status(404).send({ message: "Failed to update investigation" });
        }

        res.status(200).send(updatedInvestigation);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
};

export const updateCurrentStixVersionId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Assuming the investigation ID is passed as a URL parameter
        const newCurrentVersionId = Number(req.body.newCurrentVersionId);

        // Find the investigation by its ID
        const investigation = await Investigation.findOne({ id: id });
        if (!investigation) {
            return res.status(404).send({ message: "Investigation not found" });
        }

        // Ensure the new current version ID is within bounds
        if (newCurrentVersionId < 0 || newCurrentVersionId >= investigation.stix.length) {
            return res.status(400).send({ message: "Invalid version ID" });
        }

        // Update the current stix version ID
        investigation.currentStixVersionId = newCurrentVersionId;

        // Save the updated investigation
        const updatedInvestigation = await investigation.save({ validateBeforeSave: true });

        res.status(200).send(updatedInvestigation);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
};
export const getTrimmedStix = async (req: Request, res: Response) => {
    try {
        const investigation = await Investigation.findOne({ derivedFromSourceId: req.params.derivedSourceId });
        if (!investigation) {
            return res.status(404).send();
        }

        // Find the current version's data
        const currentVersion = investigation.stix.find((version) => version.versionId === investigation.currentStixVersionId);
        if (!currentVersion) {
            return res.status(404).send('Current version not found.');
        }

        const data = currentVersion.data;

        // Ensure data.objects exists and is an array
        if (!Array.isArray(data.objects)) {
            return res.status(400).send('Invalid data format: objects field is missing or not an array.');
        }

        // Extract article and iterate through objects to get entity and value
        const result = {
            article: data.article,
            entities: data.objects.map((item: any) => {
                if (item.type === 'malware') {
                    return {
                        entity: 'malware',
                        value: item.name
                    };
                } else {
                    return {
                        entity: item.entity,
                        value: item.value
                    };
                }
            })
        };

        res.status(200).send(result);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const updateComments = async (req: Request, res: Response) => {
  const { derivedFromSourceId } = req.params;
  const { updateField } = req.body; // Assuming the body has a field named 'updateField'

  try {
    const investigation = await Investigation.findOneAndUpdate(
      { derivedFromSourceId }, 
      { $set: { comments: updateField } },
      { new: true }
    );

    if (!investigation) {
      return res.status(404).json({ message: 'Result not found' });
    }

    res.status(200).send(investigation);
  } catch (error) {
    res.status(500).json({ message: 'Error', error });
  }
};

export const updateEntity = async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const { index, updateType, newValue } = req.body;

    const investigation = await Investigation.findOne({ derivedFromSourceId: resultId });

    if (!investigation) {
      return res.status(404).send();
    }

    // Sort predictions by start_pos
    investigation.predictions.sort((a, b) => a.start_pos - b.start_pos);

    // Update the appropriate field of the prediction at the specified index
    if (updateType === 'label') {
      investigation.predictions[index].entity_label = newValue;
    } else if (updateType === 'tramStatus') {
      investigation.predictions[index].tramStatus = newValue;
    } else {
      return res.status(400).send({ error: 'Invalid updateType' });
    }

    await investigation.save();

    res.status(200).send(investigation);
  } catch (error) {
    res.status(500).send(error);
  }
};
  