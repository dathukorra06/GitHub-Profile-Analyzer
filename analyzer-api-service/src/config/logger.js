'use strict';

require('dotenv').config();
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const {
  LOG_LEVEL = 'info',
  LOG_DIR = 'logs',
  NODE_ENV = 'development',
} = process.env;

const { combine, timestamp, errors, json, colorize, printf, splat } = format;

// Pretty format for development console
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${ts}] ${level}: ${stack || message}${metaStr}`;
  }),
);

// JSON format for production / file transports
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
);

const loggerTransports = [];

// Console transport — always enabled
loggerTransports.push(
  new transports.Console({
    format: NODE_ENV === 'production' ? prodFormat : devFormat,
    silent: NODE_ENV === 'test',
  }),
);

// Rotating file transports — disabled in test
if (NODE_ENV !== 'test') {
  loggerTransports.push(
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: prodFormat,
      level: LOG_LEVEL,
    }),
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: prodFormat,
      level: 'error',
    }),
  );
}

const logger = createLogger({
  level: LOG_LEVEL,
  transports: loggerTransports,
  exitOnError: false,
});

module.exports = logger;
