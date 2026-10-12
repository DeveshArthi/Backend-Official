const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');



const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
}));

app.use(express.json({ limit: '20kb' }));

const services = [
  'website-development',
  'website-redesign',
  'ui-ux-design',
  'maintenance',
  'other',
];

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
}));

app.use(express.json({ limit: '20kb' }));

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    service: {
      type: String,
      required: true,
      enum: services,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

const Contact = mongoose.model('Contact', contactSchema);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  const fields = ['name', 'email', 'service', 'message'];

  if (fields.some((field) => typeof body[field] !== 'string')) {
    return res.status(400).json({
      message: 'Please complete all fields.',
    });
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const service = body.service.trim();
  const message = body.message.trim();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (
    !name || name.length > 100 ||
    !validEmail || email.length > 254 ||
    !services.includes(service) ||
    !message || message.length > 5000
  ) {
    return res.status(400).json({
      message: 'Please enter a valid name, email, service, and message.',
    });
  }

  try {
    await Contact.create({ name, email, service, message });

    return res.status(201).json({
      message: `Thank you, ${name}! Your enquiry has been received. We'll contact you soon.`,
    });
  } catch (error) {
    console.error('Contact save failed:', error.message);

    return res.status(500).json({
      message: 'Unable to save your enquiry. Please try again later.',
    });
  }
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid request data.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Your enquiry is too large.' });
  }

  res.status(500).json({ message: 'Something went wrong.' });
});

async function startServer() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  if (/[<>]/.test(uri) || uri.includes('YOUR_ENCODED_PASSWORD')) {
    throw new Error('Replace the MongoDB password placeholder in .env');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('MongoDB connected');

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error.message);

  // Show the underlying connection errors without printing the URI.
  const servers = error.reason?.servers;

  if (servers) {
    for (const [host, server] of servers) {
      if (server.error) {
        console.error(`${host}: ${server.error.message}`);
      }
    }
  }

  process.exit(1);
});