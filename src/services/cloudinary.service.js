// ============================================
// ANVEXS - Cloudinary Upload Service
// ============================================
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../config/logger.js';

const configure = () => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key    = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Cloudinary credentials missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env'
    );
  }

  cloudinary.config({ cloud_name, api_key, api_secret });
};

export const uploadCV = (fileBuffer, originalName, applicantName) => {
  configure(); // throws immediately if creds missing — no silent failure

  return new Promise((resolve, reject) => {
    const safeName  = applicantName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const ext       = originalName.split('.').pop().toLowerCase();
    const publicId  = `anvexs/cvs/${safeName}_${timestamp}`;

    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'raw', format: ext },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          reject(error);
        } else {
          logger.info(`CV uploaded: ${result.secure_url}`);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );

    stream.end(fileBuffer);
  });
};

export const deleteCV = async (publicId) => {
  configure();
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
};

export default { uploadCV, deleteCV };