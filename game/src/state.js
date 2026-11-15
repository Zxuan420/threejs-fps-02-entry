export const GAME_STATE = {
  phase: 'buy', // 'buy' | 'round' | 'ended' | 'match_end'
  roundTimer: 100,
  buyTimer: 15,
  round: 1,
  maxRounds: 9,
  scoreSentinels: 0,
  scoreJackals: 0,
  money: 800,
  aliveSentinels: 4,
  aliveJackals: 4,
  activeWeapon: 0, // 0: P9, 1: VK-9, 2: Wasp, 3: Longshot
  weaponsOwned: [true, true, false, false], // P9, VK-9, Wasp, Longshot
  grenadesCount: 0,
  armor: 0,
  bomb: {
    carrier: null, // 'player' | 'jackal' | null
    dropped: false,
    position: null,
    planted: false,
    site: null, // 'A' | 'B'
    fuseTimer: 35,
    defuseTimer: 0,
    defusing: false,
    defuser: null,
  },
  killFeed: [],
  buyMenuOpen: false,
  roundBannerText: '',
  roundBannerTimer: 0,
  matchWinner: null,
};
