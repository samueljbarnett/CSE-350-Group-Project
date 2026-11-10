-- Create the database
CREATE DATABASE IF NOT EXISTS `hospital_db`;





-- Role Setup
CREATE ROLE IF NOT EXISTS `hospital_webapp_role`;

GRANT
    SELECT, INSERT, UPDATE, DELETE
    ON hospital_db.*
    TO 'hospital_webapp_role';





-- Tables for login handling
CREATE TABLE IF NOT EXISTS `hospital_db`.`user`(
	`user_id` INT AUTO_INCREMENT PRIMARY KEY,
	`username` VARCHAR(15) NOT NULL,
	`password` MEDIUMBLOB NOT NULL,
	`active` BOOL DEFAULT FALSE NOT NULL,
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