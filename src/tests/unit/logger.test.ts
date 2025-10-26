import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    Logger,
    LogLevel,
    setLoggerConfig,
    getLoggerConfig,
    createLogger,
} from '../../shared/lib/logger';

describe('Logger', () => {
    // Spy auf console methods
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Reset Config
        setLoggerConfig({
            minLevel: LogLevel.DEBUG,
            enableTimestamps: true,
            enableColors: false, // Farben aus für einfacheres Testing
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Logger Creation', () => {
        it('sollte Logger mit Kontext erstellen', () => {
            const logger = new Logger('TestService');
            expect(logger).toBeDefined();
        });

        it('sollte Logger mit createLogger Helper erstellen', () => {
            const logger = createLogger('TestService');
            expect(logger).toBeDefined();
        });

        it('sollte Logger mit custom minLevel erstellen', () => {
            const logger = new Logger('TestService', LogLevel.WARN);

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warn message');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
        });
    });

    describe('Log Levels', () => {
        it('sollte DEBUG Messages loggen', () => {
            const logger = new Logger('TestService');
            logger.debug('Debug message');

            expect(consoleDebugSpy).toHaveBeenCalled();
            const call = consoleDebugSpy.mock.calls[0][0];
            expect(call).toContain('[DEBUG]');
            expect(call).toContain('[TestService]');
            expect(call).toContain('Debug message');
        });

        it('sollte INFO Messages loggen', () => {
            const logger = new Logger('TestService');
            logger.info('Info message');

            expect(consoleInfoSpy).toHaveBeenCalled();
            const call = consoleInfoSpy.mock.calls[0][0];
            expect(call).toContain('[INFO]');
            expect(call).toContain('[TestService]');
            expect(call).toContain('Info message');
        });

        it('sollte WARN Messages loggen', () => {
            const logger = new Logger('TestService');
            logger.warn('Warning message');

            expect(consoleWarnSpy).toHaveBeenCalled();
            const call = consoleWarnSpy.mock.calls[0][0];
            expect(call).toContain('[WARN]');
            expect(call).toContain('[TestService]');
            expect(call).toContain('Warning message');
        });

        it('sollte ERROR Messages loggen', () => {
            const logger = new Logger('TestService');
            const error = new Error('Test error');
            logger.error('Error message', error);

            expect(consoleErrorSpy).toHaveBeenCalled();
            const [message, errorObj] = consoleErrorSpy.mock.calls[0];
            expect(message).toContain('[ERROR]');
            expect(message).toContain('[TestService]');
            expect(message).toContain('Error message');
            expect(errorObj).toBe(error);
        });
    });

    describe('Log Level Filtering', () => {
        it('sollte nur Logs >= minLevel ausgeben', () => {
            const logger = new Logger('TestService', LogLevel.WARN);

            logger.debug('Debug');
            logger.info('Info');
            logger.warn('Warn');
            logger.error('Error');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('sollte globale minLevel Config respektieren', () => {
            setLoggerConfig({ minLevel: LogLevel.ERROR });
            const logger = new Logger('TestService');

            logger.debug('Debug');
            logger.info('Info');
            logger.warn('Warn');
            logger.error('Error');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('Structured Data', () => {
        it('sollte strukturierte Daten mitloggen', () => {
            const logger = new Logger('TestService');
            const data = { itemId: 123, count: 5 };

            logger.info('Processing items', data);

            expect(consoleInfoSpy).toHaveBeenCalled();
            const call = consoleInfoSpy.mock.calls[0][0];
            expect(call).toContain('Processing items');
            expect(call).toContain('itemId');
            expect(call).toContain('123');
        });

        it('sollte komplexe Objekte stringifyen', () => {
            const logger = new Logger('TestService');
            const data = {
                user: { id: 1, name: 'Test' },
                items: [1, 2, 3],
                nested: { deep: { value: 'test' } },
            };

            logger.debug('Complex data', data);

            expect(consoleDebugSpy).toHaveBeenCalled();
            const call = consoleDebugSpy.mock.calls[0][0];
            expect(call).toContain('Complex data');
        });

        it('sollte Error-Objekte separat handhaben', () => {
            const logger = new Logger('TestService');
            const error = new Error('Test error');
            const data = { itemId: 123 };

            logger.error('Failed to process', error, data);

            expect(consoleErrorSpy).toHaveBeenCalled();
            const [message, errorObj] = consoleErrorSpy.mock.calls[0];
            expect(message).toContain('Failed to process');
            expect(message).toContain('itemId');
            expect(errorObj).toBe(error);
        });
    });

    describe('Context', () => {
        it('sollte verschiedene Kontexte unterscheiden', () => {
            const logger1 = new Logger('Service1');
            const logger2 = new Logger('Service2');

            logger1.info('Message 1');
            logger2.info('Message 2');

            const call1 = consoleInfoSpy.mock.calls[0][0];
            const call2 = consoleInfoSpy.mock.calls[1][0];

            expect(call1).toContain('[Service1]');
            expect(call2).toContain('[Service2]');
        });

        it('sollte lange Kontextnamen handhaben', () => {
            const logger = new Logger('VeryLongServiceNameForTesting');
            logger.info('Message');

            const call = consoleInfoSpy.mock.calls[0][0];
            expect(call).toContain('[VeryLongServiceNameForTesting]');
        });
    });

    describe('Configuration', () => {
        it('sollte Config setzen können', () => {
            setLoggerConfig({ minLevel: LogLevel.WARN });
            const config = getLoggerConfig();

            expect(config.minLevel).toBe(LogLevel.WARN);
        });

        it('sollte nur geänderte Config-Werte updaten', () => {
            const originalConfig = getLoggerConfig();
            setLoggerConfig({ minLevel: LogLevel.ERROR });
            const newConfig = getLoggerConfig();

            expect(newConfig.minLevel).toBe(LogLevel.ERROR);
            expect(newConfig.enableTimestamps).toBe(originalConfig.enableTimestamps);
        });

        it('sollte Timestamps deaktivieren können', () => {
            setLoggerConfig({ enableTimestamps: false });
            const logger = new Logger('TestService');

            logger.info('Message');

            const call = consoleInfoSpy.mock.calls[0][0];
            // Sollte kein Timestamp-Pattern enthalten
            expect(call).not.toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
        });
    });

    describe('Real-World Scenarios', () => {
        it('sollte API-Request loggen', () => {
            const logger = new Logger('WaniKaniAPI');

            logger.debug('Sending request', {
                method: 'GET',
                url: '/api/subjects',
                params: { level: 5 },
            });

            expect(consoleDebugSpy).toHaveBeenCalled();
            const call = consoleDebugSpy.mock.calls[0][0];
            expect(call).toContain('Sending request');
            expect(call).toContain('GET');
        });

        it('sollte Translation-Progress loggen', () => {
            const logger = new Logger('TranslationService');

            logger.info('Translation progress', {
                completed: 50,
                total: 100,
                percentage: 50,
            });

            expect(consoleInfoSpy).toHaveBeenCalled();
        });

        it('sollte Rate-Limit-Warning loggen', () => {
            const logger = new Logger('DeepLAPI');

            logger.warn('Approaching rate limit', {
                remaining: 5,
                limit: 60,
                resetAt: new Date().toISOString(),
            });

            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('sollte Upload-Fehler loggen', () => {
            const logger = new Logger('UploadService');
            const error = new Error('Network timeout');

            logger.error('Upload failed', error, {
                itemId: 123,
                retryCount: 3,
                lastError: error.message,
            });

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('sollte mit leeren Messages umgehen', () => {
            const logger = new Logger('TestService');
            logger.info('');

            expect(consoleInfoSpy).toHaveBeenCalled();
        });

        it('sollte mit undefined data umgehen', () => {
            const logger = new Logger('TestService');
            logger.info('Message', undefined);

            expect(consoleInfoSpy).toHaveBeenCalled();
        });

        it('sollte mit non-Error in error() umgehen', () => {
            const logger = new Logger('TestService');
            logger.error('Error', 'not an error object');

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('sollte mit zirkulären Referenzen umgehen', () => {
            const logger = new Logger('TestService');
            const circular: any = { a: 1 };
            circular.self = circular;

            // Sollte nicht crashen
            expect(() => logger.debug('Circular', circular)).not.toThrow();
        });
    });
});
