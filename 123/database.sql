-- Run this SQL script in phpMyAdmin or MySQL CLI to set up the database

CREATE DATABASE IF NOT EXISTS taskify_db;

USE taskify_db;

CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(150)  NOT NULL,
    description TEXT,
    priority    ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status      ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
    due_date    DATE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
