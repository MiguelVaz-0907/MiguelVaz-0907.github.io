export type RsvpResponseRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  attending: 'yes' | 'no' | 'maybe'
  guest_count: number
  dietary_notes: string | null
  message: string | null
  created_at: string
}

const attendingPt: Record<RsvpResponseRow['attending'], string> = {
  yes: 'Sim',
  no: 'Não',
  maybe: 'Talvez',
}

export function rsvpAttendingLabel(a: RsvpResponseRow['attending']): string {
  return attendingPt[a] ?? a
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatRsvpReportDate(iso: string): string {
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return iso
  }
}

/** Contagens para o resumo no admin. */
export function summarizeRsvpRows(rows: RsvpResponseRow[]) {
  let yes = 0
  let no = 0
  let maybe = 0
  let headsConfirmed = 0
  for (const r of rows) {
    if (r.attending === 'yes') {
      yes += 1
      headsConfirmed += Math.max(0, r.guest_count)
    }
    else if (r.attending === 'no') no += 1
    else maybe += 1
  }
  return { yes, no, maybe, headsConfirmed, total: rows.length }
}

function csvCell(s: string): string {
  const t = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[;\n"]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

/** CSV com separador `;` para abrir bem no Excel em PT. */
export function rsvpRowsToCsv(rows: RsvpResponseRow[]): string {
  const header = [
    'Nome',
    'Resposta',
    'N.º convidados',
    'Data do registo',
    'Email',
    'Telefone',
    'Notas alimentação',
    'Mensagem',
  ]
  const lines = [
    header.map(csvCell).join(';'),
    ...rows.map((r) =>
      [
        r.full_name,
        rsvpAttendingLabel(r.attending),
        String(r.guest_count),
        formatRsvpReportDate(r.created_at),
        r.email ?? '',
        r.phone ?? '',
        r.dietary_notes ?? '',
        r.message ?? '',
      ]
        .map(csvCell)
        .join(';'),
    ),
  ]
  return `\uFEFF${lines.join('\r\n')}`
}
