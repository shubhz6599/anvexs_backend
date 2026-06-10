import Newsletter from '../models/autoMailer.model.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const storage = multer.memoryStorage();


export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

export const createNewsletter = async (req, res) => {

  try {
    configureCloudinary();
    const { subject, content, scheduledFor } = req.body;

    const scheduledDate = new Date(scheduledFor);

    // ✅ Guard against invalid dates from UI
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduledFor date'
      });
    }

    let attachmentUrl = '';

    if (req.file) {

      const uploaded = await new Promise(
        (resolve, reject) => {

          cloudinary.uploader.upload_stream(
            {
              folder: 'anvexs/newsletters',
              resource_type: 'auto'
            },
            (err, result) => {

              if (err) return reject(err);

              resolve(result);
            }
          ).end(req.file.buffer);
        }
      );

      attachmentUrl = uploaded.secure_url;
    }

    // In createNewsletter, after cloudinary upload:
    const newsletter = await Newsletter.create({
      subject,
      content,
      scheduledFor: scheduledDate,
      attachmentUrl,
      attachmentType: req.file?.mimetype || '' // ← save original mimetype
    });

    return res.status(201).json({
      success: true,
      message: 'Newsletter scheduled successfully',
      newsletter
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};