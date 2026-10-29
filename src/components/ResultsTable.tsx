import { elimResult } from '../elims'
import { allianceResult } from '../rankings'
import type { ElimMatch, Match, Team } from '../types'

const AUTON = { R: 'Red', B: 'Blue', D: 'Tie' } as const

/** Read-only results of played matches (qualification or elimination). */
export default function ResultsTable({ matches, teams }: { matches: (Match | ElimMatch)[]; teams: Team[] }) {
  const name = (n: string) => teams.find((t) => t.number === n)?.name
  const alliance = (m: Match | ElimMatch, side: 'red' | 'blue') => (
    <td className={`px-2 py-1 ${side === 'red' ? 'bg-alliance-red/15' : 'bg-alliance-blue/15'}`}>
      {'seeds' in m && <span className="mr-1.5 text-xs font-bold text-zinc-500">A{m.seeds[side === 'red' ? 0 : 1]}</span>}
      {m[side].map((t) => (
        <span key={t} title={name(t)} className="mr-2 font-mono">
          <span className={m.dq?.includes(t) ? 'line-through opacity-60' : ''}>{t}</span>
          {m.surrogates?.includes(t) && <sup title="Surrogate: doesn't count for rankings">*</sup>}
          {m.dq?.includes(t) && <span className="ml-1 rounded bg-amber-500 px-1 text-[10px] font-bold text-black">DQ</span>}
        </span>
      ))}
    </td>
  )
  const won = (m: Match | ElimMatch, side: 'R' | 'B') => ('seeds' in m ? elimResult(m) === side : allianceResult(m, side) === 'W')

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-zinc-500">
        <tr className="[&>th]:px-2">
          <th>Match</th><th className="text-alliance-red">Red</th><th className="text-alliance-blue">Blue</th>
          <th className="text-right">Score</th><th>Auton</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id} className="border-t border-zinc-200 tabular-nums dark:border-zinc-800">
            <td className="px-2 font-semibold whitespace-nowrap">{m.id}</td>
            {alliance(m, 'red')}{alliance(m, 'blue')}
            <td className="px-2 text-right whitespace-nowrap">
              <span className={`text-alliance-red ${won(m, 'R') ? 'font-black' : ''}`}>{m.redScore}{m.redAWP && <sup>AWP</sup>}</span>
              {' – '}
              <span className={`text-alliance-blue ${won(m, 'B') ? 'font-black' : ''}`}>{m.blueScore}{m.blueAWP && <sup>AWP</sup>}</span>
            </td>
            <td className="px-2">{m.auton ? AUTON[m.auton] : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
