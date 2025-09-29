import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
      documentType: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    paperSize: { type: String, default: "A4" },
    margins: {
      top: { type: Number, default: 1 },
      bottom: { type: Number, default: 1 },
      left: { type: Number, default: 1 },
      right: { type: Number, default: 1 },
    },
    fontFamily: { type: String, default: "Times New Roman" },
    fontSize: { type: Number, default: 12 },
    lineSpacing: { type: Number, default: 2 },
  },
  { timestamps: true }
);

const Template = mongoose.model("Template", templateSchema);
export default Template; 
