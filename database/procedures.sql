USE campusops;

DROP PROCEDURE IF EXISTS sp_check_certificate_eligibility;
DELIMITER $$

CREATE PROCEDURE sp_check_certificate_eligibility(
  IN p_event_id INT,
  IN p_min_percent INT
)
BEGIN
  SELECT
    r.id AS registration_id,
    r.user_id,
    COUNT(DISTINCT a.session_id) AS attended_count,
    totals.total_sessions,
    CASE
      WHEN totals.total_sessions = 0 THEN 0
      ELSE ROUND(COUNT(DISTINCT a.session_id) * 100 / totals.total_sessions)
    END AS percent,
    CASE
      WHEN totals.total_sessions = 0 THEN FALSE
      WHEN COUNT(DISTINCT a.session_id) * 100 / totals.total_sessions >= p_min_percent THEN TRUE
      ELSE FALSE
    END AS eligible
  FROM registrations r
  CROSS JOIN (
    SELECT COUNT(*) AS total_sessions FROM sessions WHERE event_id = p_event_id
  ) totals
  LEFT JOIN attendance a ON a.registration_id = r.id
    AND a.session_id IN (SELECT id FROM sessions WHERE event_id = p_event_id)
  WHERE r.event_id = p_event_id
  GROUP BY r.id, r.user_id, totals.total_sessions
  ORDER BY r.id;
END$$

DELIMITER ;
