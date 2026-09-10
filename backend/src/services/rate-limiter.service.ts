import redis from "../config/redis";

export async function acquireRateLimit(
  senderId: string,
  hourlyLimit: number,
  minDelaySeconds: number
): Promise<{
  allowed: boolean;
  retryAfterMs: number;
  reason: "allowed" | "min_delay" | "hourly_limit";
}> {
  const now = Date.now();

  const hourBucket = Math.floor(
    now / (60 * 60 * 1000)
  );

  const hourlyKey =
    `rate:hourly:${senderId}:${hourBucket}`;

  const delayKey =
    `rate:delay:${senderId}`;

  const luaScript = `
    local now = tonumber(ARGV[1])
    local hourlyLimit = tonumber(ARGV[2])
    local minDelayMs = tonumber(ARGV[3])

    local lastSent = redis.call("GET", KEYS[2])

    -- Minimum delay between individual sends
    if lastSent then
      local nextAllowedAt =
        tonumber(lastSent) + minDelayMs

      if now < nextAllowedAt then
        return {
          0,
          nextAllowedAt - now,
          1
        }
      end
    end

    -- Atomic hourly counter
    local count =
      redis.call("INCR", KEYS[1])

    if count == 1 then
      redis.call("EXPIRE", KEYS[1], 3700)
    end

    -- Hourly limit reached
    if count > hourlyLimit then
      redis.call("DECR", KEYS[1])

      local nextHour =
        (math.floor(now / 3600000) + 1) * 3600000

      return {
        0,
        nextHour - now,
        2
      }
    end

    -- Reserve this send
    redis.call("SET", KEYS[2], now)

    return {
      1,
      0,
      0
    }
  `;

  const result = (await redis.eval(
    luaScript,
    2,
    hourlyKey,
    delayKey,
    now,
    hourlyLimit,
    minDelaySeconds * 1000
  )) as [number, number, number];

  const reasonCode = Number(result[2]);

  return {
    allowed: result[0] === 1,
    retryAfterMs: Number(result[1]),
    reason:
      reasonCode === 1
        ? "min_delay"
        : reasonCode === 2
        ? "hourly_limit"
        : "allowed",
  };
}