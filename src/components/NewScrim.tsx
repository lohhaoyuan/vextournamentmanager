import { useState } from 'react'
import { hasPlayed, scrimName } from '../scrims'
import { startNewScrim, useEvent } from '../store'

/** Asks how to start the next scrim. The current one goes to History if anything was played in it. */
export default function NewScrim({ onClose }: { onClose: () => void }) {
  const ev = useEvent()
  const [name, setName] = useState('')
  const start = (keepTeams: boolean) => {
    startNewScrim(keepTeams, name)
    onClose()
    location.hash = '#/teams'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form className="w-full max-w-md rounded-lg bg-zinc-100 p-5 shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); start(true) }}>
        <h2 className="mb-2 text-lg font-bold">Start a new scrim</h2>
        <p className="mb-4 text-sm text-zinc-500">
          {hasPlayed(ev)
            ? <>“{scrimName(ev)}” will be saved to History, then the schedule, scores and eliminations are cleared.</>
            : <>Nothing has been played in the current scrim, so it won't be saved to History.</>}
        </p>
        <label className="mb-4 block text-sm">
          Name <span className="text-zinc-500">(optional, defaults to the date)</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday scrim" className="mt-1 w-full" />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={() => start(false)}>Clear teams too</button>
          <button className="btn bg-alliance-blue! text-white">Keep {ev.teams.length} teams</button>
        </div>
      </form>
    </div>
  )
}
