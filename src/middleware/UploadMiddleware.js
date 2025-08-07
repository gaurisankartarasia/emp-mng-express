import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const storage = multer.memoryStorage(); 

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

export const upload = multer({ storage, fileFilter });

export const processAndSaveImage = async (req, res, next) => {
    if (!req.file) {
        return next(); 
    }

    try {
        const filename = `employee-${req.user.userId || Date.now()}-${Date.now()}.jpeg`;
        const uploadsDir = 'public/uploads/employees';
        const filepath = path.join(uploadsDir, filename);

        fs.mkdirSync(uploadsDir, { recursive: true });

        await sharp(req.file.buffer)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(filepath);

        req.file.path = `/uploads/employees/${filename}`;
        
        if (req.body.oldPicturePath) {
            const oldPath = path.join('public', req.body.oldPicturePath);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Error processing image.', error: error.message });
    }
};