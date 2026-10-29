import { ROUND_NAME, ROUNDS, matchId, type Bracket as BracketData, type Series, type Side } from '../elims'
import { isPlayed, type Round, type Team } from '../types'

const short = (round: Round, slot: number) => (round === 'F' ? 'F' : `${round}-${slot}`)

function Row({ s, i, b, teams }: { s: Series; i: 0 | 1; b: BracketData; teams: Team[] }) {
  const side: Side = s.sides[i]
  const known = typeof s.sides[0] === 'number' && typeof s.sides[1] === 'number'
  const color = known ? (i === 0 ? 'border-alliance-red' : 'border-alliance-blue') : 'border-zinc-500'
  const decided = s.winner !== undefined
  const last = s.matches.findLast(isPlayed)
  const value = !known || !last ? '' : s.bestOf === 3 ? s.wins[i] : i === 0 ? last.redScore : last.blueScore

  let label
  if (typeof side === 'number') {
    const teamsOf = b.alliances[side - 1]
    label = (
      <>
        <span className="mr-[0.4em] font-black">A{side}</span>
        <span className="truncate" title={teamsOf.map((t) => teams.find((x) => x.number === t)?.name || t).join(' & ')}>
          {teamsOf.join(' ')}
        </span>
      </>
    )
  } else if (side === null) label = <span className="text-zinc-500 italic">BYE</span>
  else {
    const prev = ROUNDS[ROUNDS.indexOf(s.round) - 1]
    label = <span className="text-zinc-500">Winner of {short(prev, s.slot * 2 - 1 + i)}</span>
  }

  return (
    <div className={`flex items-center gap-[0.4em] border-l-[0.3em] px-[0.4em] py-[0.15em] ${color}
      ${decided && s.winner === side ? 'bg-white/15 font-bold' : ''} ${decided && s.winner !== side ? 'opacity-45' : ''}`}>
      <div className="flex min-w-0 flex-1">{label}</div>
      <div className="tabular-nums">{value}</div>
    </div>
  )
}

function Box({ s, b, teams, next }: { s: Series; b: BracketData; teams: Team[]; next?: string }) {
  const live = s.matches.some((m) => m.id === next)
  return (
    <div className={`rounded-[0.4em] bg-zinc-800/80 text-white ${live ? 'ring-[0.2em] ring-amber-400' : ''}`}>
      <div className="flex justify-between px-[0.5em] pt-[0.15em] text-[0.75em] text-zinc-400">
        <span>{matchId(s.round, s.slot, 1).replace(/-1$/, '')}</span>
        {s.bestOf === 3 && <span>Best of 3</span>}
      </div>
      <Row s={s} i={0} b={b} teams={teams} />
      <Row s={s} i={1} b={b} teams={teams} />
    </div>
  )
}

/**
 * Two-sided bracket like Figure T17-1: the top half of each round on the left, the bottom half on the
 * right, meeting at the Finals. Size it with the font size of the parent.
 */
export default function Bracket({ b, teams }: { b: BracketData; teams: Team[] }) {
  const next = b.matches.find((m) => !isPlayed(m))?.id
  const rounds = ROUNDS.slice(ROUNDS.indexOf(b.first), -1)
  const ofRound = (r: Round) => b.series.filter((s) => s.round === r)
  const final = ofRound('F')[0]
  const column = (title: string, list: Series[], key: string) => (
    <div key={key} className="flex min-w-[10em] flex-1 flex-col">
      <div className="mb-[0.4em] text-center text-[0.8em] font-bold tracking-wide text-zinc-400 uppercase">{title}</div>
      <div className="flex flex-1 flex-col justify-around gap-[0.5em]">
        {list.map((s) => <Box key={s.slot} s={s} b={b} teams={teams} next={next} />)}
      </div>
    </div>
  )

  return (
    <div className="flex h-full gap-[0.8em]">
      {rounds.map((r) => column(ROUND_NAME[r], ofRound(r).slice(0, ofRound(r).length / 2), `L${r}`))}
      <div className="flex min-w-[11em] flex-1 flex-col">
        <div className="mb-[0.4em] text-center text-[0.8em] font-bold tracking-wide text-zinc-400 uppercase">Finals</div>
        <div className="flex flex-1 flex-col justify-center gap-[0.6em]">
          <Box s={final} b={b} teams={teams} next={next} />
          {b.champion && (
            <div className="rounded-[0.4em] bg-amber-400 px-[0.5em] py-[0.3em] text-center font-black text-zinc-900">
              🏆 Alliance {b.champion}
              <div className="text-[0.85em] font-bold">{b.alliances[b.champion - 1].join(' & ')}</div>
            </div>
          )}
        </div>
      </div>
      {[...rounds].reverse().map((r) => column(ROUND_NAME[r], ofRound(r).slice(ofRound(r).length / 2), `R${r}`))}
    </div>
  )
}
