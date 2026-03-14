-- ══════════════════════════════════════════
--  CoreInventory — MySQL Database Setup
--  Run this ONCE in phpMyAdmin → SQL tab
-- ══════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS coreinventory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE coreinventory;

-- Users table (managers + staff both stored here)
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50)  NOT NULL,   -- 'Inventory Manager' or 'Warehouse Staff'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_role (email, role)   -- same email allowed in different roles
);
