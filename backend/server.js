require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { AssemblyAI } = require('assemblyai');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

app.get('/', (req, res) => {
  res.send('Order Sense backend is running');
});

app.post('/api/transcribe-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const transcript = await client.transcripts.transcribe({
      audio: req.file.buffer,
      speech_models: ['universal-3-5-pro'],
      format_text: true,
      punctuate: true
    });

    if (transcript.status === 'error') {
      return res.status(500).json({ error: transcript.error });
    }

    res.json({ text: transcript.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
});

app.post('/api/triage', (req, res) => {
  const { orderText } = req.body;

  if (!orderText) {
    return res.status(400).json({ error: 'orderText is required' });
  }

  const lowerText = orderText.toLowerCase();

  let urgency = 'medium';
  if (lowerText.includes('asap') || lowerText.includes('urgent') || lowerText.includes('now')) {
    urgency = 'high';
  } else if (lowerText.includes('whenever') || lowerText.includes('no rush')) {
    urgency = 'low';
  }

  let prepTime = '15-20 mins';
  if (lowerText.includes('rice') || lowerText.includes('soup')) {
    prepTime = '20-25 mins';
  } else if (lowerText.includes('drink') || lowerText.includes('snack')) {
    prepTime = '5 mins';
  }

  const ambiguous = !lowerText.match(/\d/) && !lowerText.includes('plate') && !lowerText.includes('bowl');

  res.json({
    urgency,
    prepTime,
    ambiguous,
    flagReason: ambiguous ? 'No clear quantity specified' : null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
