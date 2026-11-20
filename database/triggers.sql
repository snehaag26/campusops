USE campusops;

DELIMITER $$

CREATE TRIGGER trg_session_full_block
BEFORE INSERT ON session_registrations
FOR EACH ROW
BEGIN
  DECLARE current_count INT DEFAULT 0;
  DECLARE session_limit INT DEFAULT 0;

  SELECT COUNT(*) INTO current_count
  FROM session_registrations
  WHERE session_id = NEW.session_id;

  SELECT capacity INTO session_limit
  FROM sessions
  WHERE id = NEW.session_id;

  IF current_count >= session_limit THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session is full';
  END IF;
END$$

CREATE TRIGGER trg_attendance_mark_checked_in
AFTER INSERT ON attendance
FOR EACH ROW
BEGIN
  UPDATE registrations
  SET status = 'checked_in'
  WHERE id = NEW.registration_id;
END$$

DELIMITER ;
