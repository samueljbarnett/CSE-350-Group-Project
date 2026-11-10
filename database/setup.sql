-- ------------------- --
-- Create the database --
-- ------------------- --
CREATE DATABASE IF NOT EXISTS `hospital_db`;
USE `hospital_db`





-- ---------- --
-- Role Setup --
-- ---------- --
CREATE ROLE IF NOT EXISTS `hospital_webapp_role`;

GRANT
    SELECT, INSERT, UPDATE, DELETE
    ON hospital_db.*
    TO 'hospital_webapp_role';

GRANT
	EXECUTE
	ON hospital_db.*
	TO 'hospital_webapp_role';





-- ----------- --
-- Table setup --
-- ----------- --

-- Tables for login handling --
CREATE TABLE IF NOT EXISTS `hospital_db`.`user`(
	`user_id` INT AUTO_INCREMENT PRIMARY KEY,
	`username` VARCHAR(15) NOT NULL,
	`password` BLOB(256) NOT NULL,
	`salt` BLOB(256) NOT NULL,
	`active` BOOL DEFAULT TRUE NOT NULL,
	UNIQUE INDEX `user_username_index` (`username` asc) VISIBLE
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`group`(
	`group_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name_id` VARCHAR(30) NOT NULL,
	UNIQUE INDEX `group_name_id_index` (`name_id` asc) VISIBLE
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`group_entry`(
	`group_id` INT NOT NULL,
	`user_id` INT NOT NULL,
	UNIQUE INDEX `group_entry_index` (`group_id` asc, `user_id` asc) VISIBLE,
	FOREIGN KEY (`group_id`) REFERENCES `hospital_db`.`group`(`group_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`user_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`login_tokens`(
	`user_id` INT NOT NULL,
	`value` TEXT(512) NOT NULL,
	`expires` DATETIME NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT
);

-- Tables for asset tracking
CREATE TABLE IF NOT EXISTS `hospital_db`.`asset`(
	`asset_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(100) NOT NULL,
	`type` VARCHAR(15) NOT NULL, -- TODO: Figure out constraints, possibly use ENUM type
	`location` VARCHAR(100) NOT NULL,
	`count` INT NOT NULL DEFAULT 0,
	`max_count` INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`asset_assignment`(
	`assignment_id` INT AUTO_INCREMENT PRIMARY KEY,
	`asset_id` INT NOT NULL,
	`loaner_id` INT NOT NULL,
	`assignee_id` INT NOT NULL,
	`checkin_time` DATETIME NOT NULL,
	`checkout_time` DATETIME,
	FOREIGN KEY (`asset_id`) REFERENCES `hospital_db`.`asset`(`asset_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`loaner_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`assignee_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`asset_access`(
	`asset_id` INT NOT NULL,
	`group_id` INT NOT NULL,
	UNIQUE INDEX `asset_access_index` (`asset_id` asc, `group_id` asc) VISIBLE,
	FOREIGN KEY (`group_id`) REFERENCES `hospital_db`.`group`(`group_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`asset_id`) REFERENCES `hospital_db`.`asset`(`asset_id`) ON DELETE RESTRICT
);

-- Tables for diagnosises
CREATE TABLE IF NOT EXISTS `hospital_db`.`diagnosis`(
	`diagnosis_id` INT AUTO_INCREMENT PRIMARY KEY,
	`diagnosis_name` VARCHAR(100) NOT NULL,
	`diagnosis_desc` TEXT NOT NULL,
	`diagnosis_desc_patient` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`symptom`(
	`symptom_id` INT AUTO_INCREMENT PRIMARY KEY,
	`symptom_name` VARCHAR(100) NOT NULL,
	`symptom_desc` TEXT NOT NULL,
	`symptom_desc_patient` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`diagnosis_symptom`(
	`diagnosis_id` INT NOT NULL,
	`symptom_id` INT NOT NULL,
	UNIQUE INDEX `diagnosis_symptom_index` (`diagnosis_id` asc, `symptom_id` asc) VISIBLE,
	FOREIGN KEY (`diagnosis_id`) REFERENCES `hospital_db`.`diagnosis`(`diagnosis_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`symptom_id`) REFERENCES `hospital_db`.`symptom`(`symptom_id`) ON DELETE RESTRICT
);

-- Tables for Patient handling
CREATE TABLE IF NOT EXISTS `hospital_db`.`staff`(
	`staff_id` INT AUTO_INCREMENT PRIMARY KEY,
	`user_id` INT NOT NULL,
	`f_name` VARCHAR(75) NOT NULL,
	`l_name` VARCHAR(75) NOT NULL,
	`m_name` VARCHAR(75) NOT NULL,
	`active` BOOL DEFAULT TRUE NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`patient`(
	`patient_id` INT AUTO_INCREMENT PRIMARY KEY,
	`user_id` INT NOT NULL,
	`f_name` VARCHAR(75) NOT NULL,
	`l_name` VARCHAR(75) NOT NULL,
	`m_name` VARCHAR(75) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `hospital_db`.`user`(`user_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`prescription`(
	`prescription_id` INT AUTO_INCREMENT PRIMARY KEY,
	`patient_id` INT NOT NULL,
	`staff_id` INT NOT NULL,
	`prescription_time` DATETIME NOT NULL,
	`prescription_desc` TEXT NOT NULL,
	`prescription_stop_time` DATETIME NOT NULL,
	`dosage_amount` INT NOT NULL,
	`medication_name` VARCHAR(100) NOT NULL,
	-- TODO: Add foreign key to assets? (allow null)
	`active` BOOL DEFAULT FALSE NOT NULL,
	`deactivate_staff_id` INT,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`staff_id`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`deactivate_staff_id`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`stay`(
	`stay_id` INT AUTO_INCREMENT PRIMARY KEY,
	`patient_id` INT NOT NULL,
	`checkin_time` DATETIME NOT NULL,
	`checkout_time` DATETIME,
	`primary_staff` INT NOT NULL,
	`bed_id` INT,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`primary_staff`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`bed_id`) REFERENCES `hospital_db`.`asset`(`asset_id`) ON DELETE RESTRICT
	-- TODO: Add a constraint to make sure the bed_id's asset.type is a bed
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`patient_access`(
	`patient_id` INT NOT NULL,
	`group_id` INT NOT NULL,
	UNIQUE INDEX `patient_access_index` (`patient_id` asc, `group_id` asc) VISIBLE,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`group_id`) REFERENCES `hospital_db`.`group`(`group_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`staff_assignment`(
	`staff_id` INT NOT NULL,
	`patient_id` INT NOT NULL,
	UNIQUE INDEX `staff_assignment_index` (`staff_id` asc, `patient_id` asc) VISIBLE,
	FOREIGN KEY (`staff_id`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`medical_history`(
	`history_id` INT AUTO_INCREMENT PRIMARY KEY,
	`patient_id` INT NOT NULL,
	`staff_id` INT NOT NULL,
	`time` DATETIME NOT NULL,
	`desc` TEXT NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`patient_contact`(
	`contact_id` INT AUTO_INCREMENT PRIMARY KEY,
	`patient_id` INT NOT NULL,
	`contact_type` ENUM("PHONE_HOME", "PHONE_CELL", "PHONE_TEXT", "EMAIL"),
	`contact_value` VARCHAR(100) NOT NULL,
	`priority` INT DEFAULT 0,
	FOREIGN KEY (`patient_id`) REFERENCES `hospital_db`.`patient`(`patient_id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `hospital_db`.`patent_symptom`(
	`patient_symptom_id` INT AUTO_INCREMENT PRIMARY KEY,
	`symptom_id` INT NOT NULL,
	`staff_id` INT NOT NULL,
	`observation_time` DATETIME NOT NULL,
	`stay_id` INT NOT NULL,
	FOREIGN KEY (`symptom_id`) REFERENCES `hospital_db`.`symptom`(`symptom_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`staff_id`) REFERENCES `hospital_db`.`staff`(`staff_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`stay_id`) REFERENCES `hospital_db`.`stay`(`stay_id`) ON DELETE RESTRICT
);





-- ---------- --
-- Procedures --
-- ---------- --

-- create user
DELIMITER $$
CREATE PROCEDURE `hospital_db`.CreateUser(
	IN p_Username VARCHAR(15),
	IN p_Password VARCHAR(128)
)
BEGIN
	-- Hash the new password
	DECLARE p_salt BLOB(256);
	DECLARE p_hash BLOB(256);

	SET p_salt = RANDOM_BYTES(256);
	SET p_hash = UNHEX(SHA2(CONCAT(HEX(p_salt), p_Password), 256));

	-- Insert the user into the database
	INSERT INTO `hospital_db`.`user`
		(`username`, `password`, `salt`)
	VALUES
		(p_Username, p_hash, p_salt);

	-- Return the user id
	SELECT LAST_INSERT_ID() AS `user_id`;
END$$
DELIMITER ;

-- TODO: add user to group

-- authenticate user
DELIMITER $$
CREATE PROCEDURE `hospital_db`.AuthenticateUser(
	IN p_Username VARCHAR(15),
	IN p_Password VARCHAR(128)
)
BEGIN
	DECLARE p_valid BOOL DEFAULT NULL;
	DECLARE p_active BOOL DEFAULT FALSE;
	DECLARE p_salt BLOB(256);
	DECLARE p_existing_password BLOB(256);
	DECLARE p_hash BLOB(256);

	SELECT `active`, `salt`, `password`
		INTO p_active, p_salt, p_existing_password
		FROM `hospital_db`.`user`
		WHERE `username` = p_Username;

	IF (p_active = TRUE)
	THEN
		-- Hash the new password
		SET p_hash = UNHEX(SHA2(CONCAT(HEX(p_salt), p_Password), 256));
	
		IF (p_existing_password = p_hash)
		THEN
			SET p_valid = TRUE;
		END IF;
	END IF;

	SELECT p_valid AS authenticated;
END$$
DELIMITER ;

-- authenticate user and get token
DELIMITER $$
CREATE PROCEDURE `hospital_db`.MakeAuthToken(
	IN p_Username VARCHAR(15),
	IN p_Password VARCHAR(128)
)
BEGIN
	DECLARE p_token TEXT(512) DEFAULT NULL;
	DECLARE p_active BOOL DEFAULT FALSE;
	DECLARE p_salt BLOB(256);
	DECLARE p_existing_password BLOB(256);
	DECLARE p_hash BLOB(256);
	DECLARE p_user_id INT;

	SELECT `active`, `salt`, `password`, `user_id`
		INTO p_active, p_salt, p_existing_password, p_user_id
		FROM `hospital_db`.`user`
		WHERE `username` = p_Username;

	IF (p_active = TRUE)
	THEN
		-- Hash the new password
		SET p_hash = UNHEX(SHA2(CONCAT(HEX(p_salt), p_Password), 256));
	
		IF (p_existing_password = p_hash)
		THEN
			-- Create a new login token that expires in 2 hours
			SET p_token = HEX(RANDOM_BYTES(256));
			INSERT INTO `hospital_db`.`login_tokens`
				(`user_id`,`value`,`expires`)
			VALUES
				(p_user_id,p_token,ADDTIME(NOW(), "2:00:00"));
		END IF;
	END IF;

	SELECT p_token AS authenticated;
END$$
DELIMITER ;

-- TODO: authenticate user token
DELIMITER $$
CREATE PROCEDURE `hospital_db`.AuthenticateToken(
	IN p_Username VARCHAR(15),
	IN p_Token TEXT(512)
)
BEGIN
	DECLARE p_valid BOOL DEFAULT FALSE;
	DECLARE p_active BOOL DEFAULT FALSE;
	DECLARE p_user_id INT;

	SELECT `user_id`, `active`
		INTO p_user_id, p_active
		FROM `hospital_db`.`user`
		WHERE `username` = p_Username;

	SELECT COUNT(*) > 0 AS valid
		FROM `hospital_db`.`login_tokens`
		WHERE (
			`user_id` = p_user_id
		AND `expires` > NOW()
		AND `value` = p_Token
		)
	;
END$$
DELIMITER ;

-- TODO: create stay
-- TODO: add patient contact
-- TODO: remove patient contact
-- TODO: get stay
-- TODO: search user
-- TODO: search active staff
-- TODO: get staff assignments
-- TODO: assign staff to stay
-- TODO: remove staff to stay
-- TODO: assign room
-- TODO: add symptom
-- TODO: edit symptom
-- TODO: add medical history




-- ----------------------- --
-- Make some default items --
-- ----------------------- --
-- Create admin user
CALL CreateUser('admin', 'password');
-- Create admin group
INSERT INTO `hospital_db`.`group`
	(`name_id`) VALUES ("main_admin");
-- Create front desk group
INSERT INTO `hospital_db`.`group`
	(`name_id`) VALUES ("main_front");
-- Create adjust asset group
INSERT INTO `hospital_db`.`group`
	(`name_id`) VALUES ("main_asset");
-- Create pharm tech group
INSERT INTO `hospital_db`.`group`
	(`name_id`) VALUES ("main_pharmtech");