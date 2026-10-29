import type { Match } from './types'

export type Rand = () => number

/** Small seeded PRNG so schedules are reproducible in tests. */
export function mulberry32(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: Rand): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
const inc = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by)
const PAIRINGS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]] as const

function combos<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  return arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map((c) => [x, ...c]))
}

const blankMatch = (i: number, red: [string, string], blue: [string, string], surrogates: string[]): Match => ({
  id: `Q${i + 1}`, red, blue, auton: null, redAWP: false, blueAWP: false,
  ...(surrogates.length ? { surrogates } : {}),
})

/** Greedy pass: build matches one at a time, picking the 4 teams and pairing that cost least. */
// Works on team indices (0..n-1) with flat arrays because it runs thousands of times.
function buildOnce(teams: string[], perTeam: number, rand: Rand): Match[] {
  const n = teams.length
  const total = Math.ceil((n * perTeam) / 4)
  const count = new Array(n).fill(0) // real (ranked) appearances
  const extra = new Array(n).fill(0) // surrogate appearances
  const lean = new Array(n).fill(0) // red appearances minus blue appearances
  const partners = new Array(n * n).fill(0)
  const opponents = new Array(n * n).fill(0)
  const ids = teams.map((_, i) => i)
  let last = new Set<number>()
  const matches: Match[] = []
  const shortlistGroups = combos(ids.slice(0, Math.min(n, 8)), 4) // index groups into the shortlist

  for (let i = 0; i < total; i++) {
    const left = total - i // matches remaining including this one
    const needed = (t: number) => count[t] < perTeam
    const minCount = Math.min(...ids.filter(needed).map((t) => count[t]))

    const cost = ids.map((t) => {
      const c = last.has(t) ? 60 : 0
      if (!needed(t)) return c + 10_000 + extra[t] * 100
      const mustPlay = perTeam - count[t] >= left ? -1000 : 0 // otherwise it can't reach perTeam
      return c + mustPlay + (count[t] - minCount) * 40
    })

    // Shortlist the most suitable teams, then try every group of 4 and every pairing of them.
    const shortlist = shuffle(ids, rand).sort((a, b) => cost[a] - cost[b])

    let best = { cost: Infinity, a: [0, 0], b: [0, 0] }
    for (const g of shortlistGroups) {
      const group = g.map((k) => shortlist[k])
      const base = group.reduce((s, t) => s + cost[t], 0)
      for (const [[p, q], [r, s]] of PAIRINGS) {
        const a = [group[p], group[q]]
        const b = [group[r], group[s]]
        let c = base + rand() // random tie-break
        c += 20 * (partners[a[0] * n + a[1]] + partners[b[0] * n + b[1]])
        for (const x of a) for (const y of b) c += 5 * opponents[x * n + y]
        if (c < best.cost) best = { cost: c, a, b }
      }
    }
    const { a, b } = best

    // Put on red whichever alliance has played blue more often.
    const sum = (al: number[]) => lean[al[0]] + lean[al[1]]
    const [r, bl] = sum(a) < sum(b) || (sum(a) === sum(b) && rand() < 0.5) ? [a, b] : [b, a]

    const surrogates = [...r, ...bl].filter((t) => !needed(t))
    for (const t of [...r, ...bl]) needed(t) ? count[t]++ : extra[t]++
    r.forEach((t) => lean[t]++)
    bl.forEach((t) => lean[t]--)
    for (const [x, y] of [r, bl]) partners[x * n + y]++, partners[y * n + x]++
    for (const x of r) for (const y of bl) opponents[x * n + y]++, opponents[y * n + x]++
    last = new Set([...r, ...bl])
    const name = (t: number) => teams[t]
    matches.push(blankMatch(i, [name(r[0]), name(r[1])], [name(bl[0]), name(bl[1])], surrogates.map(name)))
  }
  return matches
}

export function consecutiveCount(matches: Match[]): number {
  let n = 0
  for (let i = 1; i < matches.length; i++) {
    const prev = new Set([...matches[i - 1].red, ...matches[i - 1].blue])
    n += [...matches[i].red, ...matches[i].blue].filter((t) => prev.has(t)).length
  }
  return n
}

/** Lower is better. Balance is weighted so heavily that it always wins. */
export function scheduleCost(matches: Match[], teams: string[], perTeam: number): number {
  const count = new Map(teams.map((t) => [t, 0]))
  const side = new Map(teams.map((t) => [t, 0]))
  const partners = new Map<string, number>()
  const opponents = new Map<string, number>()
  for (const m of matches) {
    for (const t of [...m.red, ...m.blue]) if (!m.surrogates?.includes(t)) inc(count, t)
    m.red.forEach((t) => inc(side, t, 1))
    m.blue.forEach((t) => inc(side, t, -1))
    inc(partners, pairKey(...m.red))
    inc(partners, pairKey(...m.blue))
    for (const x of m.red) for (const y of m.blue) inc(opponents, pairKey(x, y))
  }
  const repeats = (m: Map<string, number>) => [...m.values()].reduce((s, c) => s + (c * (c - 1)) / 2, 0)
  let cost = 0
  for (const t of teams) cost += 100_000 * Math.abs(count.get(t)! - perTeam) + 10 * Math.abs(side.get(t)!)
  return cost + 50 * consecutiveCount(matches) + 20 * repeats(partners) + 5 * repeats(opponents)
}

/** Generates a qualification schedule where every team plays `perTeam` ranked matches. */
export function generateSchedule(teams: string[], perTeam: number, rand: Rand = Math.random, attempts = 150): Match[] {
  if (teams.length < 4) throw new Error('Need at least 4 teams')
  if (perTeam < 1) throw new Error('Matches per team must be at least 1')
  let best: Match[] = []
  let bestCost = Infinity
  for (let i = 0; i < attempts; i++) {
    const m = buildOnce(teams, perTeam, rand)
    const c = scheduleCost(m, teams, perTeam)
    if (c < bestCost) [best, bestCost] = [m, c]
  }
  return best
}

/** Reorders matches (fewest back-to-backs out of many tries), renumbers them and clears all scores. */
export function shuffleMatches(matches: Match[], rand: Rand = Math.random, attempts = 300): Match[] {
  let best = matches
  let bestCost = Infinity
  for (let i = 0; i < attempts; i++) {
    const m = shuffle(matches, rand)
    const c = consecutiveCount(m)
    if (c < bestCost) [best, bestCost] = [m, c]
  }
  return best.map((m, i) => blankMatch(i, m.red, m.blue, m.surrogates ?? []))
}
