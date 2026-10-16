// Preserve the reward workflow's API without the retired, incompatible AdMob SDK.
// No ad provider or paid account is configured; never manufacture earned rewards.
const unavailable = () => { throw new Error('Ads are disabled. A reviewed native provider adapter is required.'); };
export const AdMobRewarded = {
  setAdUnitID: (_id: string) => unavailable(),
  addEventListener: (_event: string, _callback: () => void) => ({ remove: () => {} }),
  requestAdAsync: async () => unavailable(),
  showAdAsync: async () => unavailable(),
};
