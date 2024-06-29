import mongoose from "mongoose";

const ConnectDB = async () => {
  try {
    const connection = await mongoose.connect(`mongodb+srv://jashanmaybe75:zJNuagx59eZ4Imk1@cluster0.uy4nu8u.mongodb.net/Salondekho`);
    console.log(`MongoDB connected : ${connection.connection.host}`);
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default ConnectDB;
