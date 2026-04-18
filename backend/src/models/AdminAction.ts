import mongoose, { Schema } from "mongoose";

export interface IAdminAction {
  materialId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

const AdminActionSchema = new Schema<IAdminAction>(
  {
    materialId: { type: String, required: true },
    action: { type: String, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
      },
    },
  },
);

AdminActionSchema.index({ materialId: 1 });

export const AdminAction = mongoose.model<IAdminAction>(
  "AdminAction",
  AdminActionSchema,
);
