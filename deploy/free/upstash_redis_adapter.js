// ==============================================================================
// Upstash Free Serverless Redis Adapter for DispatchAgent AI (A2A Message Bus)
// Docs: https://upstash.com/docs/redis/overall/getstarted
// 10,000 commands/day free forever with zero connection pooling issues.
// ==============================================================================

export class UpstashRedisAdapter {
  constructor(options = {}) {
    this.url = options.url || process.env.UPSTASH_REDIS_REST_URL;
    this.token = options.token || process.env.UPSTASH_REDIS_REST_TOKEN;
    this.isConfigured = Boolean(this.url && this.token);
  }

  async publish(channel, message) {
    if (!this.isConfigured) {
      // Fall back to in-memory bus if credentials are not configured
      return { status: 'mock_local', channel, message };
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const response = await fetch(`${this.url}/PUBLISH/${channel}/${encodeURIComponent(payload)}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async lpush(key, value) {
    if (!this.isConfigured) return { status: 'mock_local' };
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const response = await fetch(`${this.url}/LPUSH/${key}/${encodeURIComponent(payload)}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }
}
