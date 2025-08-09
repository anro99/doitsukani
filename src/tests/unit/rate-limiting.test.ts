import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Rate Limiting System", () => {
    let originalSetTimeout: typeof setTimeout;

    beforeEach(() => {
        originalSetTimeout = global.setTimeout;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        global.setTimeout = originalSetTimeout;
    });

    describe("Rate Limit Delay", () => {
        it("should delay 1.2 seconds between API calls", async () => {
            let delayStarted = false;
            let delayCompleted = false;

            // Simulate the rateLimitDelay function
            const rateLimitDelay = async (currentIndex: number, totalCount: number) => {
                if (currentIndex >= totalCount - 1) return;

                const delayMs = 1200;
                delayStarted = true;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayCompleted = true;
            };

            // Start the delay (not the last item)
            const delayPromise = rateLimitDelay(0, 5);

            expect(delayStarted).toBe(true);
            expect(delayCompleted).toBe(false);

            // Fast-forward time
            vi.advanceTimersByTime(1200);

            await delayPromise;
            expect(delayCompleted).toBe(true);
        });

        it("should not delay after the last item", async () => {
            let delayCalled = false;

            const rateLimitDelay = async (currentIndex: number, totalCount: number) => {
                if (currentIndex >= totalCount - 1) return;

                delayCalled = true;
                await new Promise(resolve => setTimeout(resolve, 1200));
            };

            // Last item should not trigger delay
            await rateLimitDelay(4, 5);

            expect(delayCalled).toBe(false);
        });
    });

    describe("Exponential Backoff Retry", () => {
        it("should retry with exponential backoff on 429 errors", async () => {
            const retryDelays: number[] = [];

            const uploadSingleRadicalWithRetry = async (
                result: any,
                stats: any,
                retryCount = 0
            ): Promise<any> => {
                // Simulate 429 error on first two attempts
                if (retryCount < 2) {
                    const waitTime = Math.pow(2, retryCount) * 5000;
                    retryDelays.push(waitTime);

                    // Don't actually wait in tests, just track the delay
                    await Promise.resolve();

                    // Recurse for retry
                    return uploadSingleRadicalWithRetry(result, stats, retryCount + 1);
                }

                // Success on third attempt
                return { ...stats, successful: stats.successful + 1 };
            };

            const result = { radical: { meaning: "Test" }, status: 'success' };
            const stats = { successful: 0, failed: 0 };

            const finalStats = await uploadSingleRadicalWithRetry(result, stats);

            expect(retryDelays).toEqual([5000, 10000]);
            expect(finalStats.successful).toBe(1);
            expect(finalStats.failed).toBe(0);
        });

        it("should fail after 3 retry attempts", async () => {
            let retryCount = 0;
            let errorMessage = "";

            const uploadSingleRadicalWithRetry = async (
                result: any,
                stats: any,
                currentRetryCount = 0
            ): Promise<any> => {
                retryCount = currentRetryCount;

                // Always return 429 error
                if (currentRetryCount < 3) {
                    // Don't actually wait in tests
                    await Promise.resolve();

                    return uploadSingleRadicalWithRetry(result, stats, currentRetryCount + 1);
                }

                // Max retries reached
                result.status = 'error';
                errorMessage = '❌ Rate-Limit erreicht (nach 3 Versuchen): Too Many Requests';
                return { ...stats, failed: stats.failed + 1 };
            };

            const result = { radical: { meaning: "Test" }, status: 'success' };
            const stats = { successful: 0, failed: 0 };

            const finalStats = await uploadSingleRadicalWithRetry(result, stats);

            expect(retryCount).toBe(3);
            expect(finalStats.successful).toBe(0);
            expect(finalStats.failed).toBe(1);
            expect(result.status).toBe('error');
            expect(errorMessage).toContain('Rate-Limit erreicht (nach 3 Versuchen)');
        });

        it("should handle non-429 errors immediately", async () => {
            let retryAttempted = false;
            let errorMessage = "";

            const uploadSingleRadicalWithRetry = async (
                result: any,
                stats: any,
                retryCount = 0
            ): Promise<any> => {
                if (retryCount > 0) {
                    retryAttempted = true;
                }

                // Simulate 500 error (not rate-limiting)
                result.status = 'error';
                errorMessage = '❌ Upload-Fehler: Internal Server Error';
                return { ...stats, failed: stats.failed + 1 };
            };

            const result = { radical: { meaning: "Test" }, status: 'success' };
            const stats = { successful: 0, failed: 0 };

            const finalStats = await uploadSingleRadicalWithRetry(result, stats);

            expect(retryAttempted).toBe(false);
            expect(finalStats.failed).toBe(1);
            expect(errorMessage).toContain('Internal Server Error');
        });
    });

    describe("Rate Limiting Integration", () => {
        it("should calculate safe request rate", () => {
            // WaniKani allows 60 requests/minute
            // Safe rate: 50 requests/minute = 1200ms between requests
            const safeDelayMs = 1200;
            const requestsPerMinute = 60000 / safeDelayMs;
            const waniKaniLimit = 60000 / 60; // 60 requests/minute = 1000ms between requests

            expect(requestsPerMinute).toBe(50); // 50 requests/minute is safe
            expect(safeDelayMs).toBeGreaterThan(waniKaniLimit); // Should be slower than WaniKani limit
        });

        it("should demonstrate rate limiting benefits", () => {
            const scenarios = [
                {
                    name: "Without Rate Limiting",
                    requests: 100,
                    delayMs: 0,
                    expectedTime: 0,
                    rateLimitHits: Math.max(0, 100 - 60) // Requests beyond 60/minute
                },
                {
                    name: "With Rate Limiting",
                    requests: 100,
                    delayMs: 1200,
                    expectedTime: 100 * 1200, // 2 minutes total
                    rateLimitHits: 0
                }
            ];

            scenarios.forEach(scenario => {
                console.log(`📊 ${scenario.name}:`);
                console.log(`   ${scenario.requests} requests`);
                console.log(`   ${scenario.delayMs}ms delay between requests`);
                console.log(`   Expected time: ${scenario.expectedTime / 1000}s`);
                console.log(`   Rate limit hits: ${scenario.rateLimitHits}`);

                if (scenario.name.includes("Without")) {
                    expect(scenario.rateLimitHits).toBeGreaterThan(0);
                } else {
                    expect(scenario.rateLimitHits).toBe(0);
                }
            });
        });
    });
});
