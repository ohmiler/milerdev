-- Migration: Add accounts table for NextAuth OAuth (Google Login)
-- Run this on Railway MySQL database

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `type` varchar(255) NOT NULL,
  `provider` varchar(255) NOT NULL,
  `providerAccountId` varchar(255) NOT NULL,
  `refresh_token` text,
  `access_token` text,
  `expires_at` int DEFAULT NULL,
  `token_type` varchar(255) DEFAULT NULL,
  `scope` varchar(255) DEFAULT NULL,
  `id_token` text,
  `session_state` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `accounts_userId_idx` (`userId`),
  UNIQUE KEY `accounts_provider_providerAccountId` (`provider`, `providerAccountId`),
  CONSTRAINT `accounts_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
