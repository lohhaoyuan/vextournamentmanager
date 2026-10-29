// Point values used by the rankings. Change these to match the current official rules.
export const settings = {
  winWP: 2,
  tieWP: 1,
  awpWP: 1,
  autonWinAP: 6,
  autonTieAP: 3,
  timer: {
    autonSeconds: 15,
    pauseSeconds: 3,
    driverSeconds: 105,
  },
}

export type Settings = typeof settings
