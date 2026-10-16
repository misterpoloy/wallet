'use client'

import { Fragment, type ReactNode } from 'react'

// Small, safe markdown subset for agent replies: paragraphs, headings, lists, tables,
// **bold**, *italic* and `code`. Builds React elements; never injects HTML.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${i++}`
    if (tok.startsWith('**')) out.push(<strong key={key} className="font-semibold text-white">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={key} className="px-1 py-0.5 rounded bg-white/10 text-[12px]">{tok.slice(1, -1)}</code>)
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isDivider = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }

    if (isTableRow(line) && i + 1 < lines.length && isDivider(lines[i + 1]!)) {
      const head = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i]!)) rows.push(cells(lines[i++]!))
      blocks.push(
        <div key={k++} className="overflow-x-auto my-2">
          <table className="w-full text-[12px] border-collapse">
            <thead><tr>{head.map((h, j) => <th key={j} className="text-left font-semibold text-white/60 px-2 py-1 border-b border-white/10">{inline(h, `h${k}${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="px-2 py-1 border-b border-white/5 whitespace-nowrap">{inline(c, `c${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push(<p key={k++} className="font-semibold text-white mt-3 mb-1">{inline(heading[2]!, `hd${k}`)}</p>)
      i++
      continue
    }

    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*([-*•]|\d+\.)\s+/, ''))
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={k++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 my-1.5 space-y-0.5`}>
          {items.map((it, j) => <li key={j}>{inline(it, `li${k}${j}`)}</li>)}
        </List>,
      )
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i]!.trim() && !isTableRow(lines[i]!) && !/^(#{1,4})\s/.test(lines[i]!) && !/^\s*([-*•]|\d+\.)\s+/.test(lines[i]!)) para.push(lines[i++]!)
    blocks.push(
      <p key={k++} className="my-1.5">
        {para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${k}${j}`)}</Fragment>)}
      </p>,
    )
  }
  return <>{blocks}</>
}
