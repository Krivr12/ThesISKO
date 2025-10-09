// server/services/retryService.js

/**
 * Generic retry helper with exponential backoff.
 *
 * Example:
 * await retry(() => supabase.from(...).insert(...), { retries: 3, minTimeout: 500 })
 *
 * Options:
 *  - retries: number of attempts (default 3)
 *  - minTimeout: initial delay ms (default 500)
 *  - factor: exponential factor (default 2)
 */

export async function retry(fn, maxRetries = 3, baseDelay = 500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt); // exponential backoff
      console.warn(`⚠️ Retry attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
   // All retries exhausted
  throw lastError;
}

 

