/**
 * Lonzo Party Live - Coin System & Reference Pricing Configuration
 * Proposed reference pricing: 1 coin ≈ PKR 2
 */

export const COIN_CONFIG = {
  // Configurable conversion rate: 1 coin = 2 PKR
  COIN_TO_PKR_RATE: 2.0,
  
  // Coin currency symbol and display name
  CURRENCY_NAME: 'Lonzo Coins',
  COIN_ICON: '🪙',

  // Conversion helper
  coinsToPkr: (coins: number): number => {
    return Math.round(coins * COIN_CONFIG.COIN_TO_PKR_RATE);
  },

  // Formatted display with PKR equivalent
  formatCoinsWithPkr: (coins: number, compact = false): string => {
    const formattedCoins = compact ? formatCompactNumber(coins) : coins.toLocaleString();
    const pkrAmount = COIN_CONFIG.coinsToPkr(coins);
    const formattedPkr = pkrAmount.toLocaleString();
    return `${formattedCoins} Coins (≈ PKR ${formattedPkr})`;
  },

  // Formatted short PKR equivalent string
  formatPkrEquivalent: (coins: number): string => {
    const pkr = COIN_CONFIG.coinsToPkr(coins);
    return `≈ PKR ${pkr.toLocaleString()}`;
  },

  // Formats coin amount only
  formatCoins: (coins: number): string => {
    return `${COIN_CONFIG.COIN_ICON} ${coins.toLocaleString()}`;
  }
};

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}
