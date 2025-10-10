
const { createClient } = require('@supabase/supabase-js');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

function createSupabaseAdmin() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase service credentials are not configured.');
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        const files = [];

        busboy.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            const safeName = filename || `upload-${Date.now()}`;
            const filepath = path.join(os.tmpdir(), safeName);
            const writeStream = fs.createWriteStream(filepath);
            file.pipe(writeStream);

            file.on('end', () => {
                files.push({
                    fieldname,
                    filename: safeName,
                    encoding,
                    mimetype: mimeType,
                    filepath
                });
            });

            file.on('error', reject);
        });

        busboy.on('field', (fieldname, value) => {
            fields[fieldname] = value;
        });

        let resolved = false;
        const finalize = () => {
            if (resolved) return;
            resolved = true;
            resolve({ fields, files });
        };
        busboy.on('close', finalize);
        busboy.on('finish', finalize);
        busboy.on('error', reject);
        req.on('error', reject);

        req.pipe(busboy);
    });
}

async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const { fields, files } = await parseMultipartForm(req);

        if (!files || !files.length) {
            res.status(400).json({ error: 'No file uploaded.' });
            return;
        }

        const file = files[0];
        const { uploadType } = fields; // 'support' или 'return_media'

        const supabaseAdmin = createSupabaseAdmin();
        let bucketName, destinationPath;

        if (uploadType === 'return_media') {
            // === ЛОГИКА ДЛЯ ЗАГРУЗКИ МЕДИА ВОЗВРАТА ===
            const { rentalId, mediaType, userId } = fields;

            if (!rentalId || !mediaType || !userId) {
                res.status(400).json({ error: 'rentalId, mediaType, and userId are required for return_media uploads.' });
                return;
            }

            // Валидация mediaType
            const validMediaTypes = ['photo_front', 'photo_back', 'photo_left', 'photo_right', 'video'];
            if (!validMediaTypes.includes(mediaType)) {
                res.status(400).json({ error: 'Invalid mediaType. Must be one of: ' + validMediaTypes.join(', ') });
                return;
            }

            // Валидация типа файла и размера
            const isPhoto = mediaType.startsWith('photo_');
            const isVideo = mediaType === 'video';
            
            if (isPhoto) {
                const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!allowedPhotoTypes.includes(file.mimetype)) {
                    fs.unlinkSync(file.filepath);
                    res.status(400).json({ error: 'Invalid photo type. Only JPEG and PNG are allowed.' });
                    return;
                }
                // 10MB limit for photos
                const stats = fs.statSync(file.filepath);
                if (stats.size > 10 * 1024 * 1024) {
                    fs.unlinkSync(file.filepath);
                    res.status(400).json({ error: 'Photo size exceeds 10MB limit.' });
                    return;
                }
            } else if (isVideo) {
                const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
                if (!allowedVideoTypes.includes(file.mimetype)) {
                    fs.unlinkSync(file.filepath);
                    res.status(400).json({ error: 'Invalid video type. Only MP4, WebM, and QuickTime are allowed.' });
                    return;
                }
                // 50MB limit for videos
                const stats = fs.statSync(file.filepath);
                if (stats.size > 50 * 1024 * 1024) {
                    fs.unlinkSync(file.filepath);
                    res.status(400).json({ error: 'Video size exceeds 50MB limit.' });
                    return;
                }
            }

            // Проверить что аренда существует и принадлежит пользователю
            const { data: rental, error: rentalError } = await supabaseAdmin
                .from('rentals')
                .select('id, user_id, status')
                .eq('id', rentalId)
                .eq('user_id', userId)
                .single();

            if (rentalError || !rental) {
                fs.unlinkSync(file.filepath);
                res.status(404).json({ error: 'Rental not found or does not belong to user.' });
                return;
            }

            // Определить расширение файла
            let ext = 'jpg';
            if (file.mimetype === 'image/png') ext = 'png';
            else if (file.mimetype === 'video/mp4') ext = 'mp4';
            else if (file.mimetype === 'video/webm') ext = 'webm';
            else if (file.mimetype === 'video/quicktime') ext = 'mov';

            bucketName = 'bike_returns';
            destinationPath = `${rentalId}/${mediaType}.${ext}`;

        } else {
            // === ЛОГИКА ДЛЯ ЗАГРУЗКИ ПОДДЕРЖКИ (СТАРАЯ) ===
            const { anonymousChatId, clientId } = fields;

            if (!anonymousChatId && !clientId) {
                res.status(400).json({ error: 'anonymousChatId or clientId is required for support uploads.' });
                return;
            }

            bucketName = 'support_attachments';
            destinationPath = `${clientId || anonymousChatId}/${Date.now()}-${file.filename}`;
        }

        // Загрузка файла
        const fileBuffer = fs.readFileSync(file.filepath);

        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(destinationPath, fileBuffer, {
                contentType: file.mimetype,
                upsert: uploadType === 'return_media' ? true : false
            });

        fs.unlink(file.filepath, unlinkErr => {
            if (unlinkErr) {
                console.warn('Failed to remove temporary upload:', unlinkErr.message);
            }
        });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error('Failed to upload file to storage: ' + error.message);
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(data.path);

        res.status(200).json({
            message: 'File uploaded successfully.',
            publicUrl,
            mediaType: fields.mediaType,
            fileType: file.mimetype
        });
    } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = handler;
module.exports.default = handler;
module.exports.config = { api: { bodyParser: false } };

