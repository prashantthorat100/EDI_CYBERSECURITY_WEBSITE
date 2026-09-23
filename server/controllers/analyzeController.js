const path = require('path');
const fs = require('fs');
const Scan = require('../models/Scan');
const ThreatLog = require('../models/ThreatLog');
const { analyzeUrl, analyzeDocument } = require('../services/aiService');
const { takeScreenshot } = require('../services/screenshotService');
const { buildScanResult } = require('../schemas/scanResult');

// ── @desc    Analyze a URL ────────────────────────────────────────────────────
// ── @route   POST /api/analyze/url
const analyzeUrlHandler = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Please provide a valid URL (e.g. https://example.com).' });
    }

    const start = Date.now();
    
    // Run AI analysis and Screenshot in parallel
    const [aiResult, screenshot] = await Promise.all([
      analyzeUrl(url),
      takeScreenshot(url).catch(e => {
        console.error('Screenshot error:', e);
        return null;
      })
    ]);
    
    const duration = Date.now() - start;

    const scan = await Scan.create({
      user: req.user._id,
      type: 'url',
      target: url,
      threatLevel: aiResult.risk?.severity?.toLowerCase() || aiResult.threatLevel || 'safe',
      threatScore: aiResult.risk?.risk_score ?? aiResult.threatScore ?? 0,
      confidenceScore: (aiResult.risk?.confidence * 100) || aiResult.confidenceScore || 0,
      detectedFeatures: aiResult.risk?.threats || aiResult.detectedFeatures || [],
      recommendation: aiResult.recommendation || '',
      aiExplanation: aiResult.explanation || aiResult.aiExplanation || '',
      scanDuration: aiResult.scan_duration_ms || aiResult.scanDuration || duration,
      rawAiResponse: aiResult,
      screenshot: screenshot, // Save screenshot in DB
      status: 'completed',
    });

    // Log threat if risk score > 50
    if (scan.threatScore > 50) {
      await ThreatLog.create({
        scan: scan._id,
        user: req.user._id,
        threatType: 'URL Threat',
        severity:
          scan.threatScore > 80 ? 'critical'
          : scan.threatScore > 60 ? 'high'
          : 'medium',
        description: scan.aiExplanation || 'Suspicious URL detected.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Return standardised scan result
    const result = buildScanResult(scan, url, 'url', scan._id.toString(), duration);

    return res.status(201).json({ scan, result });
  } catch (error) {
    console.error('[analyzeUrl]', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Scan failed. Please try again.',
    });
  }
};

// ── @desc    Analyze a document (PDF/DOCX) ───────────────────────────────────
// ── @route   POST /api/analyze/document
const analyzeDocumentHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { originalname, filename, mimetype, size, path: filePath } = req.file;

    // Determine type label
    const fileType =
      mimetype === 'application/pdf' ? 'pdf'
      : mimetype.includes('word') ? 'docx'
      : 'document';

    const start = Date.now();
    const aiResult = await analyzeDocument(filePath, originalname, mimetype);
    const duration = Date.now() - start;

    const scan = await Scan.create({
      user: req.user._id,
      type: fileType,
      target: filename,
      originalName: originalname,
      fileSize: size,
      pages: aiResult.pages,
      threatLevel: aiResult.threatLevel,
      threatScore: aiResult.threatScore,
      confidenceScore: aiResult.confidenceScore,
      detectedFeatures: aiResult.detectedFeatures || [],
      recommendation: aiResult.recommendation,
      aiExplanation: aiResult.aiExplanation,
      macrosFound: aiResult.macrosFound || false,
      hiddenObjects: aiResult.hiddenObjects || false,
      embeddedLinks: aiResult.embeddedLinks || [],
      scanDuration: aiResult.scanDuration || duration,
      rawAiResponse: aiResult,
      status: 'completed',
    });

    if (aiResult.threatScore > 50) {
      await ThreatLog.create({
        scan: scan._id,
        user: req.user._id,
        threatType: `${fileType.toUpperCase()} Document Threat`,
        severity:
          aiResult.threatScore > 80 ? 'critical'
          : aiResult.threatScore > 60 ? 'high'
          : 'medium',
        description: aiResult.aiExplanation || 'Suspicious document detected.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Return standardised scan result
    const result = buildScanResult(aiResult, originalname, fileType, scan._id.toString(), duration);

    return res.status(201).json({ scan, result });
  } catch (error) {
    console.error('[analyzeDocument]', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Scan failed. Please try again.',
    });
  }
};

module.exports = { analyzeUrlHandler, analyzeDocumentHandler };
