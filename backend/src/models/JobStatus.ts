import { Schema, model } from 'mongoose';

interface IJobStatus {
    reportId: number;
    status: 'started' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    error?: string;
}

const jobStatusSchema = new Schema<IJobStatus>({
    reportId: { type: Number, required: true, unique: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['started', 'running', 'completed', 'failed'],
        default: 'started'
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    error: { type: String }
});

const JobStatus = model<IJobStatus>('JobStatus', jobStatusSchema);

export { IJobStatus };
export default JobStatus;