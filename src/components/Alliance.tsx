import { teamLabel, type ElimMatch, type Match, type Team } from '../types'

/** An alliance's two teams in its colour, optionally with score, winner ring and auton badge. */
export default function Alliance({ side, m, teams, score, won, auton, big }: {
  side: 'red' | 'blue'; m: Match | ElimMatch; teams: Team[]; score?: number; won?: boolean; auton?: boolean; big?: boolean
}) {
  const bg = side === 'red' ? 'bg-alliance-red' : 'bg-alliance-blue'
  return (
    <div className={`relative flex items-center gap-[1vw] rounded-[0.8vw] ${big ? 'px-[1.5vw] py-[1vw]' : 'px-[1vw] py-[0.6vw]'} ${bg}
      ${won === false ? 'opacity-40' : ''} ${won ? 'ring-[0.3vw] ring-white' : ''}`}>
      <div className={`min-w-0 flex-1 leading-tight font-semibold ${big ? 'text-[3vw]' : 'text-[1.6vw]'}`}>
        {'seeds' in m && (
          <div className="text-[0.55em] font-bold tracking-wider uppercase opacity-80">Alliance {m.seeds[side === 'red' ? 0 : 1]}</div>
        )}
        {m[side].map((t, i) => (
          <div key={i} className="truncate">
            {m.dq?.includes(t) && <span className="mr-[0.4vw] rounded bg-amber-400 px-[0.3vw] text-zinc-900">DQ</span>}
            <span className={m.dq?.includes(t) ? 'line-through opacity-70' : ''}>{teamLabel(t, teams)}</span>
          </div>
        ))}
      </div>
      {auton && <span className="rounded bg-white/90 px-[0.5vw] text-[1vw] font-bold text-zinc-900 uppercase">Auton</span>}
      {score != null && <div className="text-[3.5vw] font-black tabular-nums">{score}</div>}
    </div>
  )
}
