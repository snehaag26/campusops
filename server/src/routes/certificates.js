import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { pool, withTransaction } from '../db.js';
import { authenticate, requireRole } from '../auth.js';

const router = Router();

// POST /api/certificates/event/:eventId/evaluate — event owner organizer or admin.
router.post('/event/:eventId/evaluate', authenticate, requireRole('admin', 'organizer'), async (req, res) => {
  const eventId = Number(req.params.eventId);
  const { minPercent } = req.body ?? {};
  if (!Number.isInteger(eventId) || eventId < 1) return res.status(400).json({ error: 'eventId must be a positive integer' });
  if (!Number.isInteger(minPercent) || minPercent < 0 || minPercent > 100) {
    return res.status(400).json({ error: 'minPercent must be an integer from 0 to 100' });
  }

  const [events] = await pool.execute('SELECT id, created_by FROM events WHERE id = ?', [eventId]);
  if (events.length === 0) return res.status(404).json({ error: 'Event not found' });
  if (req.user.role !== 'admin' && events[0].created_by !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const counts = await withTransaction(async (connection) => {
    const [resultSets] = await connection.query('CALL sp_check_certificate_eligibility(?, ?)', [eventId, minPercent]);
    const evaluations = resultSets[0] ?? [];

    for (const result of evaluations) {
      await connection.execute(
        `INSERT INTO certificates (registration_id, event_id, eligible)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE eligible = VALUES(eligible)`,
        [result.registration_id, eventId, Boolean(result.eligible)]
      );
    }

    return {
      eligible: evaluations.filter((row) => Boolean(row.eligible)).length,
      notEligible: evaluations.filter((row) => !Boolean(row.eligible)).length
    };
  });

  return res.json({ eventId, ...counts });
});

// GET /api/certificates/me — authenticated participant only.
router.get('/me', authenticate, requireRole('participant'), async (req, res) => {
  const [certificates] = await pool.execute(
    `SELECT c.id, c.eligible, c.issued_at, c.certificate_code,
            e.id AS event_id, e.title AS event_title, e.start_at, e.end_at
     FROM certificates c
     JOIN registrations r ON r.id = c.registration_id
     JOIN events e ON e.id = c.event_id
     WHERE r.user_id = ?
     ORDER BY e.start_at, c.id`,
    [req.user.id]
  );
  return res.json(certificates);
});

// GET /api/certificates/:id/download — certificate owner or admin; eligible certificates only.
router.get('/:id/download', authenticate, async (req, res) => {
  const certificateId = Number(req.params.id);
  if (!Number.isInteger(certificateId) || certificateId < 1) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const [rows] = await pool.execute(
    `SELECT c.id, c.eligible, c.certificate_code, c.issued_at,
            r.user_id, u.name AS participant_name, e.title AS event_title,
            e.start_at AS event_start_at
     FROM certificates c
     JOIN registrations r ON r.id = c.registration_id
     JOIN users u ON u.id = r.user_id
     JOIN events e ON e.id = c.event_id
     WHERE c.id = ?`,
    [certificateId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
  const certificate = rows[0];
  if (req.user.role !== 'admin' && certificate.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!certificate.eligible) return res.status(403).json({ error: 'Certificate is not eligible' });

  if (!certificate.certificate_code) {
    await pool.execute(
      `UPDATE certificates
       SET certificate_code = ?, issued_at = COALESCE(issued_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND certificate_code IS NULL`,
      [randomUUID(), certificateId]
    );
    const [updatedRows] = await pool.execute(
      'SELECT certificate_code, issued_at FROM certificates WHERE id = ?',
      [certificateId]
    );
    certificate.certificate_code = updatedRows[0].certificate_code;
    certificate.issued_at = updatedRows[0].issued_at;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);
  const pdf = new PDFDocument({ size: 'A4', margin: 64 });
  pdf.pipe(res);
  pdf.fontSize(30).text('Certificate of Participation', { align: 'center' });
  pdf.moveDown(2);
  pdf.fontSize(16).text('This certificate is presented to', { align: 'center' });
  pdf.moveDown();
  pdf.fontSize(24).text(certificate.participant_name, { align: 'center' });
  pdf.moveDown();
  pdf.fontSize(16).text(`For participating in ${certificate.event_title}`, { align: 'center' });
  pdf.moveDown(2);
  pdf.fontSize(12).text(`Event date: ${new Date(certificate.event_start_at).toLocaleDateString()}`, { align: 'center' });
  pdf.fontSize(12).text(`Issued: ${new Date(certificate.issued_at).toLocaleDateString()}`, { align: 'center' });
  pdf.text(`Certificate code: ${certificate.certificate_code}`, { align: 'center' });
  pdf.end();
});

export default router;
