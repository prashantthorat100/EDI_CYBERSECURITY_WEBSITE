const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Scan = require('../models/Scan');
const Report = require('../models/Report');

// @desc    Generate and download report for a scan
// @route   GET /api/report/:scanId
const generateReport = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, user: req.user._id });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const reportDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const fileName = `report-${scan._id}-${Date.now()}.pdf`;
    const filePath = path.join(reportDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // ── Header ───────────────────────────────────────
    doc.fontSize(24).fillColor('#00d4ff').text('Cyber Threat Analysis Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#888').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#00d4ff');
    doc.moveDown(1);

    // ── Summary ──────────────────────────────────────
    doc.fontSize(16).fillColor('#ffffff').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#cccccc');
    doc.text(`User: ${req.user.name} (${req.user.email})`);
    doc.text(`Scan Type: ${scan.type.toUpperCase()}`);
    doc.text(`Target: ${scan.originalName || scan.target}`);
    doc.text(`Scan Date: ${scan.createdAt.toLocaleString()}`);
    doc.text(`Scan Duration: ${(scan.scanDuration / 1000).toFixed(2)}s`);
    doc.moveDown(1);

    // ── Threat Score ─────────────────────────────────
    doc.fontSize(16).fillColor('#ffffff').text('Threat Assessment', { underline: true });
    doc.moveDown(0.5);
    const threatColors = { safe: '#00ff88', warning: '#ffcc00', suspicious: '#ff8800', malicious: '#ff3366' };
    doc.fontSize(14).fillColor(threatColors[scan.threatLevel] || '#888');
    doc.text(`Threat Level: ${scan.threatLevel.toUpperCase()}`);
    doc.fontSize(12).fillColor('#cccccc');
    doc.text(`Threat Score: ${scan.threatScore}/100`);
    if (scan.confidenceScore) doc.text(`Confidence Score: ${scan.confidenceScore}%`);
    doc.moveDown(1);

    // ── Detected Features ─────────────────────────────
    if (scan.detectedFeatures?.length) {
      doc.fontSize(16).fillColor('#ffffff').text('Detected Features', { underline: true });
      doc.moveDown(0.5);
      scan.detectedFeatures.forEach((f) => {
        doc.fontSize(12).fillColor('#ffaa00').text(`• ${f}`);
      });
      doc.moveDown(1);
    }

    // ── Document-specific ─────────────────────────────
    if (scan.type !== 'url') {
      doc.fontSize(16).fillColor('#ffffff').text('Document Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#cccccc');
      doc.text(`Pages: ${scan.pages || 'N/A'}`);
      doc.text(`File Size: ${scan.fileSize ? (scan.fileSize / 1024).toFixed(1) + ' KB' : 'N/A'}`);
      doc.text(`Macros Found: ${scan.macrosFound ? 'YES' : 'NO'}`);
      doc.text(`Hidden Objects: ${scan.hiddenObjects ? 'YES' : 'NO'}`);
      if (scan.embeddedLinks?.length) {
        doc.text(`Embedded Links: ${scan.embeddedLinks.join(', ')}`);
      }
      doc.moveDown(1);
    }

    // ── AI Explanation ────────────────────────────────
    if (scan.aiExplanation) {
      doc.fontSize(16).fillColor('#ffffff').text('AI Explanation', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#cccccc').text(scan.aiExplanation, { width: 495 });
      doc.moveDown(1);
    }

    // ── Recommendation ────────────────────────────────
    doc.fontSize(16).fillColor('#ffffff').text('Recommendation', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#00ff88').text(scan.recommendation || 'No recommendation available.');
    doc.moveDown(2);

    // ── Screenshot ────────────────────────────────────
    if (scan.screenshot) {
      doc.addPage();
      doc.fontSize(16).fillColor('#ffffff').text('Live Screenshot', { underline: true });
      doc.moveDown(0.5);
      try {
        const base64Data = scan.screenshot.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, {
          fit: [495, 600],
          align: 'center',
          valign: 'center'
        });
      } catch (err) {
        doc.fontSize(10).fillColor('#ff3366').text('Error rendering screenshot.');
      }
      doc.moveDown(2);
    }

    // ── Footer ────────────────────────────────────────
    doc.fontSize(10).fillColor('#555').text('AI-Powered Cyber Threat Detection Platform — Confidential', { align: 'center' });

    doc.end();

    writeStream.on('finish', async () => {
      // Save report record
      await Report.findOneAndUpdate(
        { scan: scan._id, user: req.user._id },
        {
          scan: scan._id,
          user: req.user._id,
          reportType: scan.type === 'url' ? 'url' : 'document',
          summary: `Scan of ${scan.originalName || scan.target}`,
          threatScore: scan.threatScore,
          recommendation: scan.recommendation,
          aiExplanation: scan.aiExplanation,
          filePath: fileName,
          $inc: { downloadCount: 1 },
        },
        { upsert: true, new: true }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      fs.createReadStream(filePath).pipe(res);
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ error: 'Failed to generate report: ' + err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all reports for user
// @route   GET /api/report
const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .populate('scan', 'type target originalName threatLevel threatScore createdAt')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { generateReport, getReports };
