// Point values used by the rankings. Change these to match the current official rules.
export const settings = {
  winWP: 2,
  tieWP: 1,
  awpWP: 1,
  autonWinAP: 6,
  autonTieAP: 3,
  timer: {
    countdownSeconds: 3, // 3-2-1 before auton and before driver
    autonSeconds: 15,
    driverSeconds: 105,
    warningSecondsLeft: 30, // warning sound this many seconds before the end of driver
  },
}

export type Settings = typeof settings
