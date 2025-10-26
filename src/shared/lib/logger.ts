/**
 * Strukturiertes Logging System
 * 
 * Bietet kontextbasiertes Logging mit verschiedenen Log-Levels.
 * Ersetzt console.log/warn/error durch eine typsichere, konfigurierbare Lösung.
 * 
 * **Features:**
 * - 4 Log-Levels (DEBUG, INFO, WARN, ERROR)
 * - Kontextuelle Logs (z.B. "[VocabularyManager]")
 * - Strukturierte Daten-Objekte
 * - Produktions-Modus (nur WARN/ERROR)
 * - Einfache Integration
 * 
 * **Verwendung:**
 * ```typescript
 * const logger = new Logger('VocabularyService');
 * 
 * logger.debug('Starting translation', { itemCount: 10 });
 * logger.info('Translation completed successfully');
 * logger.warn('Rate limit approaching', { remaining: 5 });
 * logger.error('Translation failed', error, { itemId: 123 });
 * ```
 */

/**
 * Log-Levels in aufsteigender Priorität
 */
export enum LogLevel {
    DEBUG = 0,   // Detaillierte Debug-Informationen (nur Development)
    INFO = 1,    // Allgemeine Informationen
    WARN = 2,    // Warnungen (z.B. Deprecated Features, Rate Limits)
    ERROR = 3,   // Fehler die gehandhabt werden müssen
}

/**
 * Strukturiertes Log-Daten Objekt
 */
export interface LogData {
    [key: string]: unknown;
}

/**
 * Log-Entry für strukturierte Ausgabe
 */
interface LogEntry {
    timestamp: string;
    level: string;
    context: string;
    message: string;
    data?: LogData;
    error?: Error;
}

/**
 * Logger Konfiguration
 */
interface LoggerConfig {
    minLevel: LogLevel;
    enableTimestamps: boolean;
    enableColors: boolean;
    // Zukünftig: Remote Logging Service URL
    remoteLoggingUrl?: string;
}

/**
 * Default Konfiguration
 */
const DEFAULT_CONFIG: LoggerConfig = {
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
    enableTimestamps: true,
    enableColors: true,
};

/**
 * Globale Logger-Konfiguration
 */
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * ANSI Color Codes für Terminal-Ausgabe
 */
const Colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Farben
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Hintergründe
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
};

/**
 * Logger Klasse
 * 
 * Erstelle einen Logger mit Kontext für bessere Log-Nachvollziehbarkeit.
 */
export class Logger {
    private context: string;
    private minLevel: LogLevel;

    /**
     * Erstellt einen neuen Logger
     * 
     * @param context - Kontext-Name (z.B. 'VocabularyService', 'DeepLAPI')
     * @param minLevel - Minimales Log-Level (optional, nutzt Global-Config)
     */
    constructor(context: string, minLevel?: LogLevel) {
        this.context = context;
        this.minLevel = minLevel ?? globalConfig.minLevel;
    }

    /**
     * DEBUG: Detaillierte Informationen für Entwicklung
     * Nur in Development-Mode sichtbar
     */
    debug(message: string, data?: LogData): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * INFO: Allgemeine Informationen über Programmablauf
     */
    info(message: string, data?: LogData): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * WARN: Warnungen über potenzielle Probleme
     */
    warn(message: string, data?: LogData): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * ERROR: Fehler die behandelt werden müssen
     */
    error(message: string, error?: Error | unknown, data?: LogData): void {
        const errorObj = error instanceof Error ? error : undefined;
        this.log(LogLevel.ERROR, message, data, errorObj);
    }

    /**
     * Interne Log-Methode
     */
    private log(level: LogLevel, message: string, data?: LogData, error?: Error): void {
        // Prüfe ob Log-Level hoch genug ist
        if (level < this.minLevel) {
            return;
        }

        const entry = this.createLogEntry(level, message, data, error);
        this.output(entry, level);

        // Zukünftig: Remote Logging
        // if (globalConfig.remoteLoggingUrl && level >= LogLevel.ERROR) {
        //     this.sendToRemote(entry);
        // }
    }

    /**
     * Erstellt strukturierten Log-Entry
     */
    private createLogEntry(
        level: LogLevel,
        message: string,
        data?: LogData,
        error?: Error
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level: LogLevel[level],
            context: this.context,
            message,
            ...(data && { data }),
            ...(error && { error }),
        };
    }

    /**
     * Gibt Log-Entry in Console aus
     */
    private output(entry: LogEntry, level: LogLevel): void {
        const formatted = this.formatLogEntry(entry, level);

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
                console.error(formatted, entry.error);
                break;
        }
    }

    /**
     * Formatiert Log-Entry für Console-Ausgabe
     */
    private formatLogEntry(entry: LogEntry, level: LogLevel): string {
        const parts: string[] = [];

        // Timestamp
        if (globalConfig.enableTimestamps) {
            const time = new Date(entry.timestamp).toLocaleTimeString('de-DE');
            parts.push(`[${time}]`);
        }

        // Level mit Farbe
        const levelStr = this.formatLevel(level);
        parts.push(levelStr);

        // Kontext
        const contextStr = globalConfig.enableColors
            ? `${Colors.cyan}[${entry.context}]${Colors.reset}`
            : `[${entry.context}]`;
        parts.push(contextStr);

        // Message
        parts.push(entry.message);

        // Data
        if (entry.data) {
            const dataStr = this.safeStringify(entry.data);
            parts.push(`\n  ${dataStr}`);
        }

        return parts.join(' ');
    }

    /**
     * Sicheres JSON.stringify das mit zirkulären Referenzen umgehen kann
     */
    private safeStringify(data: LogData): string {
        try {
            const seen = new WeakSet();
            return JSON.stringify(
                data,
                (_key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular]';
                        }
                        seen.add(value);
                    }
                    return value;
                },
                2
            );
        } catch (error) {
            return `[Unable to stringify: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        }
    }

    /**
     * Formatiert Log-Level mit Farbe
     */
    private formatLevel(level: LogLevel): string {
        if (!globalConfig.enableColors) {
            return `[${LogLevel[level]}]`;
        }

        switch (level) {
            case LogLevel.DEBUG:
                return `${Colors.dim}[DEBUG]${Colors.reset}`;
            case LogLevel.INFO:
                return `${Colors.green}[INFO]${Colors.reset}`;
            case LogLevel.WARN:
                return `${Colors.yellow}[WARN]${Colors.reset}`;
            case LogLevel.ERROR:
                return `${Colors.red}${Colors.bright}[ERROR]${Colors.reset}`;
        }
    }
}

/**
 * Setzt globale Logger-Konfiguration
 * 
 * @example
 * ```typescript
 * // Production Mode: Nur Warnungen und Fehler
 * setLoggerConfig({ minLevel: LogLevel.WARN });
 * 
 * // Development Mode: Alles loggen mit Farben
 * setLoggerConfig({ 
 *   minLevel: LogLevel.DEBUG,
 *   enableColors: true 
 * });
 * ```
 */
export function setLoggerConfig(config: Partial<LoggerConfig>): void {
    globalConfig = { ...globalConfig, ...config };
}

/**
 * Gibt aktuelle Logger-Konfiguration zurück
 */
export function getLoggerConfig(): LoggerConfig {
    return { ...globalConfig };
}

/**
 * Erstellt einen Logger mit Kontext
 * 
 * @example
 * ```typescript
 * const logger = createLogger('MyService');
 * logger.info('Service started');
 * ```
 */
export function createLogger(context: string, minLevel?: LogLevel): Logger {
    return new Logger(context, minLevel);
}

/**
 * Default Export für einfache Verwendung
 */
export default Logger;
