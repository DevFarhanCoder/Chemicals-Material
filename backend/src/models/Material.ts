import mongoose, { Schema } from "mongoose";

export interface IMaterial {
  _id: string;
  caseNo: string;
  productName: string;
  email: string | null;
  mobile: string | null;
  companyName: string;
  location: string | null;
  price: string | null;
  priceCurrency:
    | "INR"
    | "USD"
    | "EUR"
    | "JPY"
    | "GBP"
    | "AED"
    | "CNY"
    | "SGD"
    | "CAD"
    | "AUD";
  unit: string | null;
  status: "PENDING" | "CONTACTED" | "NOT_INTERESTED" | "CONVERTED";
  remarks: string | null;
  lastContacted: Date | null;
  sourceUrl: string;
  sourceSite: string;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    _id: { type: String, required: true },
    caseNo: { type: String, required: true },
    productName: { type: String, required: true, maxlength: 500 },
    email: { type: String, default: null, maxlength: 255 },
    mobile: { type: String, default: null, maxlength: 50 },
    companyName: { type: String, required: true, maxlength: 255 },
    location: { type: String, default: null, maxlength: 255 },
    price: { type: String, default: null, maxlength: 100 },
    priceCurrency: {
      type: String,
      enum: [
        "INR",
        "USD",
        "EUR",
        "JPY",
        "GBP",
        "AED",
        "CNY",
        "SGD",
        "CAD",
        "AUD",
      ],
      default: "INR",
    },
    unit: { type: String, default: null, maxlength: 50 },
    status: {
      type: String,
      enum: ["PENDING", "CONTACTED", "NOT_INTERESTED", "CONVERTED"],
      default: "PENDING",
    },
    remarks: { type: String, default: null },
    lastContacted: { type: Date, default: null },
    sourceUrl: { type: String, required: true },
    sourceSite: { type: String, required: true, maxlength: 100 },
    scrapedAt: { type: Date, default: Date.now },
    parentId: { type: String, default: null, ref: "Material" },
  },
  {
    timestamps: true,
    _id: false, // we provide _id ourselves (UUID string)
    toJSON: {
      virtuals: true,
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
      },
    },
  },
);

MaterialSchema.index({ parentId: 1 });
MaterialSchema.index({ status: 1 });
MaterialSchema.index({ companyName: 1 });
MaterialSchema.index({ createdAt: -1 });

export const Material = mongoose.model<IMaterial>("Material", MaterialSchema);
