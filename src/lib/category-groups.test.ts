import { describe, expect, it } from 'vitest'
import { categoryGroupNames, groupCategories } from './category-groups'
import type { Category } from '../types/api'

const cat = (name: string, groupName: string | null, type: Category['type'] = 'EXPENSE'): Category => ({
  id: name,
  businessId: 'b1',
  name,
  type,
  groupName,
  isSystem: false,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('groupCategories', () => {
  it('puts categories under their group headers, with ungrouped ones under Other (last)', () => {
    const groups = groupCategories([
      cat('Transport', 'Overhead'),
      cat('Product purchase', null),
      cat('Packaging', 'Overhead'),
      cat('Boxes', 'Supplies'),
    ])
    expect(groups.map((g) => [g.label, g.items.map((c) => c.name)])).toEqual([
      ['Overhead', ['Packaging', 'Transport']],
      ['Supplies', ['Boxes']],
      ['Other', ['Product purchase']],
    ])
  })

  it('treats a blank group name as no group', () => {
    const groups = groupCategories([cat('A', '   '), cat('B', 'G')])
    expect(groups.map((g) => g.label)).toEqual(['G', 'Other'])
  })

  it('is one plain list when no category has a group (no lonely "Other" header)', () => {
    expect(groupCategories([cat('B', null), cat('A', null)])).toEqual([
      { label: null, items: [expect.objectContaining({ name: 'A' }), expect.objectContaining({ name: 'B' })] },
    ])
  })

  it('is empty-safe', () => {
    expect(groupCategories([])).toEqual([{ label: null, items: [] }])
  })
})

describe('categoryGroupNames', () => {
  it('lists each existing group once, sorted, for the suggestions', () => {
    expect(categoryGroupNames([cat('a', 'Overhead'), cat('b', 'Overhead'), cat('c', null), cat('d', 'Product')])).toEqual([
      'Overhead',
      'Product',
    ])
  })
})
