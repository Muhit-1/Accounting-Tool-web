import { describe, expect, it } from 'vitest'
import {
  EMPTY_GRID_PREFS,
  EMPTY_TABLE_PREFS,
  gridPrefsKey,
  loadGridPrefs,
  loadTablePrefs,
  savePrefs,
  tablePrefsKey,
  withHiddenColumn,
  withHiddenTable,
  withLabel,
  withLetters,
  withShowEmpty,
  withShownColumn,
  withShownTable,
  withTableName,
} from './grid-prefs'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value
    },
  }
}

describe('keys', () => {
  it('are per user and per business', () => {
    expect(gridPrefsKey('u1', 'b1', 'cashbook')).not.toBe(gridPrefsKey('u2', 'b1', 'cashbook'))
    expect(gridPrefsKey('u1', 'b1', 'cashbook')).not.toBe(gridPrefsKey('u1', 'b2', 'cashbook'))
    expect(gridPrefsKey('u1', 'b1', 'cashbook')).not.toBe(gridPrefsKey('u1', 'b1', 'orders'))
    expect(tablePrefsKey('u1', 'b1')).not.toBe(tablePrefsKey('u1', 'b2'))
  })
})

describe('load / save', () => {
  it('round-trips', () => {
    const storage = fakeStorage()
    savePrefs(storage, 'k', { labels: { desc: 'What for' }, hidden: ['proof'] })
    expect(loadGridPrefs(storage, 'k')).toEqual({ labels: { desc: 'What for' }, hidden: ['proof'] })
  })

  it('reads nothing saved, corrupt data and wrong shapes as empty', () => {
    expect(loadGridPrefs(fakeStorage(), 'k')).toEqual(EMPTY_GRID_PREFS)
    expect(loadGridPrefs(fakeStorage({ k: '{not json' }), 'k')).toEqual(EMPTY_GRID_PREFS)
    expect(loadGridPrefs(fakeStorage({ k: JSON.stringify({ labels: [1], hidden: 'x' }) }), 'k')).toEqual(EMPTY_GRID_PREFS)
    expect(loadTablePrefs(fakeStorage({ k: JSON.stringify({ names: { a: 5 } }) }), 'k')).toEqual(EMPTY_TABLE_PREFS)
  })

  it('survives storage that throws', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadGridPrefs(blocked, 'k')).toEqual(EMPTY_GRID_PREFS)
    expect(() => savePrefs(blocked, 'k', EMPTY_GRID_PREFS)).not.toThrow()
  })
})

describe('column prefs', () => {
  it('renames and un-renames', () => {
    const renamed = withLabel(EMPTY_GRID_PREFS, 'desc', '  What for  ', 'Description')
    expect(renamed.labels).toEqual({ desc: 'What for' })
    expect(withLabel(renamed, 'desc', '', 'Description').labels).toEqual({})
    expect(withLabel(renamed, 'desc', 'Description', 'Description').labels).toEqual({})
  })

  it('caps the name length', () => {
    expect(withLabel(EMPTY_GRID_PREFS, 'a', 'x'.repeat(100), 'A').labels.a).toHaveLength(40)
  })

  it('hides and shows without duplicates', () => {
    const hidden = withHiddenColumn(withHiddenColumn(EMPTY_GRID_PREFS, 'proof'), 'proof')
    expect(hidden.hidden).toEqual(['proof'])
    expect(withShownColumn(withHiddenColumn(hidden, 'cat'), 'proof').hidden).toEqual(['cat'])
    expect(withShownColumn(withHiddenColumn(hidden, 'cat'), 'all').hidden).toEqual([])
  })
})

describe('table prefs', () => {
  it('renames, hides and shows tables', () => {
    const named = withTableName(EMPTY_TABLE_PREFS, 'orders', 'Sales orders', 'Orders')
    expect(named.names).toEqual({ orders: 'Sales orders' })
    expect(withTableName(named, 'orders', '', 'Orders').names).toEqual({})
    const hidden = withHiddenTable(named, 'orders')
    expect(hidden.hidden).toEqual(['orders'])
    expect(withHiddenTable(hidden, 'orders').hidden).toEqual(['orders'])
    expect(withShownTable(hidden, 'orders').hidden).toEqual([])
  })
})

describe('letters and empty columns', () => {
  it('both are off until this viewer turns them on, and turning off removes them again', () => {
    const on = withShowEmpty(withLetters(EMPTY_GRID_PREFS, true), true)
    expect(on).toEqual({ labels: {}, hidden: [], showLetters: true, showEmpty: true })
    expect(withLetters(on, false)).toEqual({ labels: {}, hidden: [], showEmpty: true })
    expect(withShowEmpty(withLetters(on, false), false)).toEqual(EMPTY_GRID_PREFS)
  })
  it('round-trips through storage and ignores wrong values', () => {
    const storage = fakeStorage()
    savePrefs(storage, 'k', withLetters(EMPTY_GRID_PREFS, true))
    expect(loadGridPrefs(storage, 'k')).toEqual({ labels: {}, hidden: [], showLetters: true })
    expect(loadGridPrefs(fakeStorage({ k: JSON.stringify({ labels: {}, hidden: [], showLetters: 'yes' }) }), 'k')).toEqual(EMPTY_GRID_PREFS)
  })
})
