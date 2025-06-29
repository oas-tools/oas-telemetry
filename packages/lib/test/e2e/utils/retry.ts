export async function retry(fn: () => Promise<any>, { timeout = 5000, interval = 100 } = {}): Promise<any> {
    const startTime = Date.now();
    while (true) {
        try {
            return await fn();
        } catch (error: any) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`Retry failed after ${timeout}ms: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
}