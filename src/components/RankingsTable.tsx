import type { Ranking } from '../rankings'
import { teamLabel, type Team } from '../types'

const f = (n: number) => n.toFixed(2)

export default function RankingsTable({ rankings, teams }: { rankings: Ranking[]; teams: Team[] }) {
  return (
    <table className="w-full text-left">
      <thead className="sticky top-0 bg-zinc-100 text-zinc-500 dark:bg-zinc-950">
        <tr className="[&>th]:px-2 [&>th]:py-1">
          <th>Rank</th><th>Team</th><th>W-L-T</th><th>WP</th><th>AP</th><th>SP</th><th>High</th><th>2nd High</th>
        </tr>
      </thead>
      <tbody>
        {rankings.map((r) => (
          <tr key={r.team} className="border-t border-zinc-200 tabular-nums dark:border-zinc-800 [&>td]:px-2 [&>td]:py-1">
            <td className="font-bold">{r.rank}</td>
            <td>{teamLabel(r.team, teams)}</td>
            <td>{r.w}-{r.l}-{r.t}</td>
            <td>{f(r.wp)}</td><td>{f(r.ap)}</td><td>{f(r.sp)}</td><td>{r.high}</td><td>{r.high2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
