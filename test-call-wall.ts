import { CallWallAnalyzer } from './server/services/callWallAnalyzer.ts';

// Mock Unusual Whales service with deterministic data for testing
class MockUW {
  async getOptionsChain() {
    return [
      { option_type: 'call', strike: 100, open_interest: 500 },
      { option_type: 'call', strike: 110, open_interest: 800 },
      { option_type: 'put', strike: 90, open_interest: 300 }
    ];
  }
  async getSpotExposures() {
    return [
      { strike: 100, call_gamma_exposure: 1000, put_gamma_exposure: -400 },
      { strike: 110, call_gamma_exposure: 1500, put_gamma_exposure: -200 },
      { strike: 90, call_gamma_exposure: 500, put_gamma_exposure: -600 }
    ];
  }
  async getOpenInterestDelta() {
    return [
      { strike: 110, change: 200 },
      { strike: 105, change: 50 }
    ];
  }
}

(async () => {
  const analyzer = new CallWallAnalyzer(new MockUW() as any);
  const result = await analyzer.identifyCallWall('XYZ', '2024-10-18');
  console.log('Call wall result:', result);
})();
