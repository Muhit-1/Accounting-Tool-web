import type { Category } from '../types/api'

export const OTHER_GROUP_LABEL = 'Other'

// Categories filed under their group heading, for the entry form's picker.
// Ungrouped ones go under "Other" (last). When no category has a group at all
// there is nothing to separate, so one unnamed list comes back instead of a
// lonely "Other" heading.
export function groupCategories(categories: Category[]): { label: string | null; items: Category[] }[] {
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name)
  const named = new Map<string, Category[]>()
  const ungrouped: Category[] = []
  for (const category of categories) {
    const group = category.groupName?.trim()
    if (!group) {
      ungrouped.push(category)
    } else {
      named.set(group, [...(named.get(group) ?? []), category])
    }
  }
  if (named.size === 0) return [{ label: null, items: [...ungrouped].sort(byName) }]
  const groups = [...named.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items]) => ({ label, items: items.sort(byName) }))
  if (ungrouped.length > 0) groups.push({ label: OTHER_GROUP_LABEL, items: ungrouped.sort(byName) })
  return groups
}

// Existing group names, for the "Group" box's suggestions.
export function categoryGroupNames(categories: Category[]): string[] {
  const names = new Set<string>()
  for (const category of categories) {
    const group = category.groupName?.trim()
    if (group) names.add(group)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
