const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const supabase = createClient(
  'https://gbabrtcnegjhherbczuj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWJydGNuZWdqaGhlcmJjenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzQ0MTAsImV4cCI6MjA3NDcxMDQxMH0.muedJjHjqZsCUv6wtiiGoTao9t1T69lTl6p5G57_otU'
);

const checkInternalSecret = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== 'MySuperSecretKeyForBikeAppOCR123!') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// NEW: Generic function to download from any URL
async function downloadFromUrl(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    return {
      data: response.data,
      mimeType: response.headers['content-type']
    };
  } catch (error) {
    console.error(`Error downloading from URL ${url}:`, error.message);
    throw error;
  }
}

// Process OCR with Gemini (this function remains unchanged)
async function processWithGemini(files) {
  try {
    const geminiApiKey = 'AIzaSyAUay_xvRT_gcMYs3-7i8Pcli680Or5Zwk';
    const parts = files.map(file => ({
      inlineData: {
        data: file.data.toString('base64'),
        mimeType: file.mimeType
      }
    }));

    const prompt = `
Супер-строгий промпт для OCR документов (РФ + СНГ)\n\nТы — высокоточный OCR/IE-эксперт по документам, удостоверяющим личность...`; // Keeping the new prompt

    const requestBody = { contents: [{ parts: [{ text: prompt }, ...parts] }] };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' }, timeout: 120000 }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
    return JSON.parse(cleaned);

  } catch (error) {
    console.error('Gemini OCR error:', error);
    throw error;
  }
}

// Main OCR processing endpoint - REWRITTEN
app.post('/process-document', checkInternalSecret, async (req, res) => {
  const startTime = Date.now();
  let currentStep = '';

  try {
    const { userId, files: filesToDownload } = req.body;
    console.log(`🔄 [${new Date().toISOString()}] НАЧАЛО ОБРАБОТКИ: userId=${userId}`);

    if (!userId || !filesToDownload || !Array.isArray(filesToDownload) || filesToDownload.length === 0) {
      return res.status(400).json({ error: 'Request must contain userId and a non-empty files array.' });
    }

    currentStep = 'Обновление статуса на processing_ocr';
    await supabase.from('clients').update({ verification_status: 'processing_ocr', ocr_started_at: new Date().toISOString() }).eq('id', userId);
    console.log(`✅ [${new Date().toISOString()}] Статус обновлен на processing_ocr`);

    let files = [];
    currentStep = 'Скачивание файлов по прямым ссылкам';
    console.log(`📥 [${new Date().toISOString()}] ${currentStep}: ${filesToDownload.length} файлов`);

    for (const fileInfo of filesToDownload) {
        if (fileInfo.direct_url) {
            try {
                const fileData = await downloadFromUrl(fileInfo.direct_url);
                files.push({
                    data: Buffer.from(fileData.data),
                    mimeType: fileData.mimeType,
                    field: fileInfo.field
                });
                console.log(`✅ [${new Date().toISOString()}] Файл ${fileInfo.field} скачан успешно.`);
            } catch (error) {
                console.error(`❌ [${new Date().toISOString()}] ОШИБКА СКАЧИВАНИЯ ${fileInfo.field}:`, error.message);
            }
        }
    }

    if (files.length === 0) {
      throw new Error('No files could be downloaded from the provided URLs');
    }

    console.log(`📊 [${new Date().toISOString()}] УСПЕШНО СКАЧАНО ${files.length} ФАЙЛОВ ДЛЯ OCR`);

    currentStep = 'OCR обработка через Gemini';
    const ocrResult = await processWithGemini(files);
    console.log(`📋 [${new Date().toISOString()}] РЕЗУЛЬТАТЫ OCR:`, JSON.stringify(ocrResult, null, 2));

    currentStep = 'Сохранение результатов в базу данных';
    await supabase.from('clients').update({ verification_status: 'ocr_complete', recognized_data: ocrResult, ocr_completed_at: new Date().toISOString() }).eq('id', userId);

    console.log(`🎉 [${new Date().toISOString()}] OCR ЗАВЕРШЕН УСПЕШНО для пользователя ${userId}`);
    res.json({ success: true, message: 'OCR processing completed' });

  } catch (error) {
    console.error(`💥 [${new Date().toISOString()}] OCR ОБРАБОТКА ПРОВАЛИЛАСЬ НА ШАГЕ: ${currentStep}`, error);
    if (req.body.userId) {
      await supabase.from('clients').update({ verification_status: 'ocr_failed', ocr_error: `${currentStep}: ${error.message}` }).eq('id', req.body.userId);
    }
    res.status(500).json({ error: 'OCR processing failed', step: currentStep, details: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => console.log(`OCR Worker running on port ${PORT}`));
