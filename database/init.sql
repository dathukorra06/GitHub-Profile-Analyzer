-- --------------------------------------------------------
-- Database Export for GitHub Profile Analyzer
-- Compatible with MySQL 8.0+
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `github_analyzer`;
USE `github_analyzer`;

-- --------------------------------------------------------
-- Table structure for table `profiles`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `githubId` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `profileUrl` varchar(255) NOT NULL,
  `avatarUrl` varchar(255) DEFAULT NULL,
  `displayName` varchar(255) DEFAULT NULL,
  `bio` text,
  `company` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `accountCreationDate` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `githubId` (`githubId`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- Table structure for table `profile_insights`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `profile_insights`;
CREATE TABLE `profile_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profileId` int NOT NULL,
  `followerCount` int DEFAULT '0',
  `publicRepositoryCount` int DEFAULT '0',
  `totalStarsEarned` int DEFAULT '0',
  `totalForksReceived` int DEFAULT '0',
  `languageDistribution` json DEFAULT NULL,
  `topProgrammingLanguage` varchar(255) DEFAULT NULL,
  `averageRepositoryAgeDays` float DEFAULT NULL,
  `mostActiveCommitYear` int DEFAULT NULL,
  `hasReadmeCount` int DEFAULT '0',
  `forkRatio` float DEFAULT NULL,
  `topicDistribution` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `profileId` (`profileId`),
  CONSTRAINT `profile_insights_ibfk_1` FOREIGN KEY (`profileId`) REFERENCES `profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- Initial Test Data (Mock User)
-- --------------------------------------------------------

INSERT INTO `profiles` (`id`, `githubId`, `username`, `profileUrl`, `avatarUrl`, `displayName`, `bio`, `company`, `location`, `accountCreationDate`, `createdAt`, `updatedAt`) VALUES
(1, 1024025, 'torvalds', 'https://github.com/torvalds', 'https://avatars.githubusercontent.com/u/1024025?v=4', 'Linus Torvalds', NULL, 'Linux Foundation', 'Portland, OR', '2011-09-03 15:26:22', NOW(), NOW());

INSERT INTO `profile_insights` (`id`, `profileId`, `followerCount`, `publicRepositoryCount`, `totalStarsEarned`, `totalForksReceived`, `languageDistribution`, `topProgrammingLanguage`, `averageRepositoryAgeDays`, `mostActiveCommitYear`, `hasReadmeCount`, `forkRatio`, `topicDistribution`, `createdAt`, `updatedAt`) VALUES
(1, 1, 307590, 12, 249000, 63804, '{"C": 5, "Makefile": 1, "Shell": 1, "C++": 1}', 'C', 385.5, 2026, 8, 0.45, '{}', NOW(), NOW());
