import type { PersonnelVO } from '@/api/yian/config/personnel'

export const GLOBAL_PERSONNEL_STATION = '华东运营中心'

export interface PersonnelSelectOption {
  label: string
  value: string
  userId: number
  stationName: string
  bizRole: string
}

export const resolvePersonnelDisplayName = (person: Partial<PersonnelVO>) =>
  String(person.userName || '').trim()

const appendPersonnelOptions = (
  target: PersonnelSelectOption[],
  source: PersonnelVO[],
  seen: Set<string>
) => {
  source.forEach((item) => {
    const label = resolvePersonnelDisplayName(item)
    if (!label || seen.has(label)) {
      return
    }
    seen.add(label)
    target.push({
      label,
      value: label,
      userId: item.userId,
      stationName: item.stationName,
      bizRole: item.bizRole
    })
  })
}

const filterByRoles = (source: PersonnelVO[], roles: string[]) =>
  source.filter((item) => roles.includes(item.bizRole))

export const buildPersonnelOptions = (
  personnel: PersonnelVO[],
  stationName: string | undefined,
  primaryRoles: string[],
  fallbackRoles: string[] = []
) => {
  const normalizedStationName = String(stationName || '').trim()
  const activePersonnel = personnel.filter((item) => item.userStatus === 0)
  const options: PersonnelSelectOption[] = []
  const seen = new Set<string>()
  const appendByScope = (candidates: PersonnelVO[]) => {
    appendPersonnelOptions(options, filterByRoles(candidates, primaryRoles), seen)
    appendPersonnelOptions(options, filterByRoles(candidates, fallbackRoles), seen)
  }

  if (normalizedStationName) {
    appendByScope(activePersonnel.filter((item) => item.stationName === normalizedStationName))
  }

  if (normalizedStationName !== GLOBAL_PERSONNEL_STATION) {
    appendByScope(activePersonnel.filter((item) => item.stationName === GLOBAL_PERSONNEL_STATION))
  }

  appendByScope(
    activePersonnel.filter(
      (item) =>
        item.stationName !== normalizedStationName &&
        item.stationName !== GLOBAL_PERSONNEL_STATION
    )
  )

  return options
}
