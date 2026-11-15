export function createUnreadCountLoader(
  load: (userId: string) => Promise<number | null>,
  publish: (count: number) => void,
) {
  let userId: string | null = null;
  let request = 0;
  let disposed = false;
  return {
    setUser(nextUserId: string | null) {
      userId = nextUserId;
      request++;
      publish(0);
    },
    async refresh() {
      if (disposed || !userId) return;
      const currentUser = userId;
      const currentRequest = ++request;
      try {
        const count = await load(currentUser);
        if (!disposed && currentRequest === request && currentUser === userId && count !== null) publish(count);
      } catch {
        // Keep the last confirmed count when the network is temporarily unavailable.
      }
    },
    dispose() { disposed = true; request++; },
  };
}
