import { UnusualWhalesService } from './unusualWhales';

interface CallWallResult {
  callWallStrike: number | null;
  highestOiStrike: number | null;
  confirmed: boolean;
}

/**
 * Analyze Unusual Whales data to identify the call wall for a ticker.
 * Combines options chain open interest, gamma exposure, and open interest
 * delta to validate the level described in Unusual Whales documentation.
 */
export class CallWallAnalyzer {
  private uw: UnusualWhalesService;

  constructor(uw?: UnusualWhalesService) {
    this.uw = uw || new UnusualWhalesService();
  }

  /**
   * Identify the call wall for a ticker/expiry.
   * @param ticker Stock symbol to analyze
   * @param expiry Option expiry in YYYY-MM-DD format
   */
  async identifyCallWall(ticker: string, expiry: string): Promise<CallWallResult> {
    const [chain, exposures, oiDelta] = await Promise.all([
      this.uw.getOptionsChain(ticker, expiry),
      this.uw.getSpotExposures(ticker),
      this.uw.getOpenInterestDelta(ticker)
    ]);

    // Step 1: find strike with highest call open interest
    let highestOiStrike: number | null = null;
    if (chain && chain.length) {
      const calls = chain.filter((opt: any) =>
        (opt.option_type || opt.type) === 'call'
      );
      if (calls.length) {
        const highest = calls.reduce((prev: any, cur: any) => {
          const prevOi = prev.open_interest || prev.openInterest || 0;
          const curOi = cur.open_interest || cur.openInterest || 0;
          return curOi > prevOi ? cur : prev;
        });
        highestOiStrike = highest.strike;
      }
    }

    // Step 2: find strike with largest positive call gamma
    let callWallStrike: number | null = null;
    if (exposures && exposures.length) {
      const highestGamma = exposures.reduce((prev: any, cur: any) =>
        Math.abs(cur.call_gamma_exposure) > Math.abs(prev.call_gamma_exposure)
          ? cur
          : prev
      );
      callWallStrike = highestGamma?.strike ?? null;
    }

    // Step 3: confirm using open interest delta data
    let confirmed = false;
    if (callWallStrike !== null && oiDelta && oiDelta.length) {
      confirmed = oiDelta.some((d: any) => d.strike === callWallStrike);
    }

    return { callWallStrike, highestOiStrike, confirmed };
  }
}

export default new CallWallAnalyzer();
