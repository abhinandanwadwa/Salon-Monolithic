import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";
dotenv.config();

// 1️⃣ Setup Azure Blob Service Client
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

// 2️⃣ Define your container (similar to an S3 bucket)
const containerName = process.env.AZURE_CONTAINER_NAME || "salonblob";
const containerClient = blobServiceClient.getContainerClient(containerName);

// 3️⃣ Custom Multer storage engine for Azure
const azureStorage = multer.memoryStorage(); // store in memory temporarily

const upload = multer({ storage: azureStorage });

// 4️⃣ Middleware to upload to Azure after Multer processes file(s)
export const uploadToAzure = async (req, res, next) => {
  try {
    // Handle single file upload
    if (req.file) {
      const blobName = `images/${Date.now()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.upload(req.file.buffer, req.file.size, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      req.file.azureUrl = blockBlobClient.url;
      req.file.azureBlobName = blobName;
    }

    // Handle multiple files upload
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map(async (file) => {
        const blobName = `images/${Date.now()}-${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.upload(file.buffer, file.size, {
          blobHTTPHeaders: { blobContentType: file.mimetype },
        });

        file.azureUrl = blockBlobClient.url;
        file.azureBlobName = blobName;
      });

      await Promise.all(uploadPromises);
    }

    // If no files uploaded, skip (don't error - some routes might be optional)
    if (!req.file && !req.files) {
      return next();
    }

    next();
  } catch (err) {
    console.error("Azure upload failed:", err);
    res.status(500).json({ message: "Upload to Azure failed", error: err.message });
  }
};

export default upload;
