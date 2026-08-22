export type StoryRequestCapacityOptions = {
  windowMs?: number;
  maxRequestsPerWindow?: number;
  maxConcurrentRequests?: number;
  maxConcurrentRequestsPerPrincipal?: number;
  maxTrackedPrincipals?: number;
  now?: () => number;
};

export class StoryRequestCapacityError extends Error {
  constructor(
    public readonly reason: "global-capacity" | "principal-concurrency" | "principal-rate",
  ) {
    super(
      reason === "global-capacity"
        ? "Many learners are creating stories right now. Please wait a moment, then try again. Your code is still here."
        : reason === "principal-concurrency"
          ? "Your current story is still being created. Please wait for it to finish; your code is still here."
          : "You have started several stories quickly. Please wait a minute, then try again. Your code is still here.",
    );
    this.name = "StoryRequestCapacityError";
  }
}

/**
 * Bounds unique model-backed requests inside one autoscaled application instance.
 * Exact duplicate inputs are deduplicated by the interpreter request store before
 * this guard runs, so cached and shared in-flight stories do not consume capacity.
 */
export function createStoryRequestCapacity(options: StoryRequestCapacityOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequestsPerWindow = options.maxRequestsPerWindow ?? 8;
  const maxConcurrentRequests = options.maxConcurrentRequests ?? 6;
  const maxConcurrentRequestsPerPrincipal = options.maxConcurrentRequestsPerPrincipal ?? 1;
  const maxTrackedPrincipals = options.maxTrackedPrincipals ?? 1_000;
  const now = options.now ?? (() => Date.now());
  const requestTimes = new Map<string, number[]>();
  const activeByPrincipal = new Map<string, number>();
  let activeRequests = 0;

  const touch = (principal: string, timestamps: number[]) => {
    requestTimes.delete(principal);
    requestTimes.set(principal, timestamps);
  };

  const trimTrackedPrincipals = () => {
    while (requestTimes.size > maxTrackedPrincipals) {
      const oldest = requestTimes.keys().next().value;
      if (!oldest || activeByPrincipal.has(oldest)) return;
      requestTimes.delete(oldest);
    }
  };

  return {
    acquire(principal: string) {
      const timestamp = now();
      const cutoff = timestamp - windowMs;
      const recent = (requestTimes.get(principal) ?? []).filter((recordedAt) => recordedAt > cutoff);
      const principalActive = activeByPrincipal.get(principal) ?? 0;

      if (principalActive >= maxConcurrentRequestsPerPrincipal) {
        throw new StoryRequestCapacityError("principal-concurrency");
      }
      if (activeRequests >= maxConcurrentRequests) {
        throw new StoryRequestCapacityError("global-capacity");
      }
      if (recent.length >= maxRequestsPerWindow) {
        throw new StoryRequestCapacityError("principal-rate");
      }

      recent.push(timestamp);
      touch(principal, recent);
      trimTrackedPrincipals();
      activeRequests += 1;
      activeByPrincipal.set(principal, principalActive + 1);
      let released = false;

      return () => {
        if (released) return;
        released = true;
        activeRequests = Math.max(0, activeRequests - 1);
        const remaining = (activeByPrincipal.get(principal) ?? 1) - 1;
        if (remaining > 0) activeByPrincipal.set(principal, remaining);
        else activeByPrincipal.delete(principal);
      };
    },
    requestTimes,
    activeByPrincipal,
    get activeRequests() {
      return activeRequests;
    },
  };
}
