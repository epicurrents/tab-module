// @vitest-environment jsdom
/**
 * Tests for the data table.
 *
 * Every mutation here goes through the section validator, so the cases are as much about what the
 * table refuses as about what it stores: a row of the wrong width or a cell of the wrong type must
 * leave the table as it was, because the configuration is what the UI renders against.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DataTableRowValue } from '@epicurrents/core/types'
import { columns, installRuntime, removeRuntime, row, section } from './double'

import TabDataTable from '#components/TabDataTable'

let table: TabDataTable

const rows = (name: string) => table.sections.find(sec => sec.name === name)?.rows ?? []

describe('TabDataTable', () => {
    beforeEach(() => {
        installRuntime()
        table = new TabDataTable('table', columns, 'Table', [section('first', [row(1, 'a', true)])])
    })
    afterEach(() => {
        removeRuntime()
    })

    describe('construction', () => {
        it('takes the label from the name when none is given', () => {
            expect(new TabDataTable('named', columns).label).toBe('named')
        })

        it('is not metadata unless the constructor says so', () => {
            expect(table.isMetadata).toBe(false)
            expect(new TabDataTable('meta', columns, 'meta', [], true).isMetadata).toBe(true)
        })

        it('holds no sections when none are given', () => {
            expect(new TabDataTable('empty', columns).sections).toEqual([])
        })

        it('does not share its configuration with the table it was built beside', () => {
            const other = new TabDataTable('other', columns)
            table.configuration = [{ contentType: String, label: 'Only', name: 'only' }]
            expect(other.configuration).toHaveLength(3)
            expect(columns).toHaveLength(3)
        })
    })

    describe('properties', () => {
        it('takes a new column configuration', () => {
            table.configuration = [{ contentType: String, label: 'Only', name: 'only' }]
            expect(table.configuration).toHaveLength(1)
        })

        it('can be marked as metadata', () => {
            table.isMetadata = true
            expect(table.isMetadata).toBe(true)
        })

        it('takes a new label and a new name', () => {
            table.label = 'Relabelled'
            table.name = 'renamed'
            expect(table.label).toBe('Relabelled')
            expect(table.name).toBe('renamed')
        })

        it('refuses sections that do not match the columns', () => {
            table.sections = [section('bad', [[{ value: 1 }] as DataTableRowValue[]])]
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })
    })

    describe('adding rows', () => {
        it('appends to the section named', () => {
            table.addRows('first', row(2, 'b', false))
            expect(rows('first')).toHaveLength(2)
        })

        it('appends to the section at an index', () => {
            table.addRows(0, row(2, 'b', false))
            expect(rows('first')).toHaveLength(2)
        })

        it('refuses a row that does not match the column count', () => {
            table.addRows('first', [{ value: 1 }] as DataTableRowValue[])
            expect(rows('first')).toHaveLength(1)
        })

        it('refuses a row whose cell holds the wrong type', () => {
            table.addRows('first', [{ value: 'one' }, { value: 'b' }, { value: false }] as DataTableRowValue[])
            expect(rows('first')).toHaveLength(1)
        })

        it('refuses a falsy cell of the wrong type', () => {
            table.addRows('first', [{ value: 0 }, { value: 0 }, { value: false }] as DataTableRowValue[])
            expect(rows('first')).toHaveLength(1)
        })

        it('accepts an empty cell', () => {
            table.addRows('first', [{ value: 2 }, null, { value: false }] as DataTableRowValue[])
            expect(rows('first')).toHaveLength(2)
        })

        it('reports a section it does not hold', () => {
            table.addRows('no-such-section', row(2, 'b', false))
            expect(table.sections).toHaveLength(1)
        })

        it('leaves the other sections untouched', () => {
            table.addSections(section('second', [row(9, 'z', false)]))
            table.addRows('first', row(2, 'b', false))
            expect(rows('second')).toHaveLength(1)
        })

        it('writes to the section it resolved, not to every section of that name', () => {
            table.addSections(section('first', [row(9, 'z', false)]))
            table.addRows(0, row(2, 'b', false))
            expect(table.sections[0].rows).toHaveLength(2)
            expect(table.sections[1].rows).toHaveLength(1)
        })
    })

    describe('inserting rows', () => {
        it('inserts at the position given', () => {
            table.addRows('first', row(3, 'c', true))
            table.insertRows('first', 1, row(2, 'b', false))
            expect(rows('first').map(r => r[0]?.value)).toEqual([1, 2, 3])
        })

        it('refuses a row of the wrong width', () => {
            table.insertRows('first', 0, [{ value: 1 }] as DataTableRowValue[])
            expect(rows('first')).toHaveLength(1)
        })
    })

    describe('replacing rows', () => {
        it('reports a section it does not hold', () => {
            table.replaceAllRows('no-such-section', row(2, 'b', false))
            expect(rows('first')).toHaveLength(1)
        })

        it('reports a section it does not hold when replacing a range', () => {
            table.replaceRows('no-such-section', 0, 1, row(2, 'b', false))
            expect(rows('first')).toHaveLength(1)
        })

        it('refuses a replacement row of the wrong width', () => {
            table.replaceRows('first', 0, 1, [{ value: 1 }] as DataTableRowValue[])
            expect(rows('first').map(r => r[0]?.value)).toEqual([1])
        })

        it('replaces every row of a section', () => {
            table.replaceAllRows('first', row(2, 'b', false), row(3, 'c', true))
            expect(rows('first').map(r => r[0]?.value)).toEqual([2, 3])
        })

        it('replaces a range of rows', () => {
            table.replaceAllRows('first', row(1, 'a', true), row(2, 'b', false), row(3, 'c', true))
            table.replaceRows('first', 1, 2, row(9, 'z', false))
            expect(rows('first').map(r => r[0]?.value)).toEqual([1, 9, 3])
        })

        it('refuses a range that ends before it starts', () => {
            table.replaceRows('first', 2, 1, row(9, 'z', false))
            expect(rows('first').map(r => r[0]?.value)).toEqual([1])
        })

        it('clamps a range that reaches past the last row', () => {
            table.replaceRows('first', 0, 99, row(9, 'z', false))
            expect(rows('first').map(r => r[0]?.value)).toEqual([9])
        })
    })

    describe('removing rows', () => {
        it('reports a section it does not hold', () => {
            table.removeRows('no-such-section', 0)
            expect(rows('first')).toHaveLength(1)
        })

        it('removes the rows at the indices given', () => {
            table.replaceAllRows('first', row(1, 'a', true), row(2, 'b', false), row(3, 'c', true))
            table.removeRows('first', 1)
            expect(rows('first').map(r => r[0]?.value)).toEqual([1, 3])
        })

        it('removes every row when no index is given', () => {
            table.removeRows('first')
            expect(rows('first')).toHaveLength(0)
        })
    })

    describe('sections', () => {
        it('appends a section', () => {
            table.addSections(section('second'))
            expect(table.sections.map(s => s.name)).toEqual(['first', 'second'])
        })

        it('inserts a section at the position given', () => {
            table.insertSections(0, section('zeroth'))
            expect(table.sections.map(s => s.name)).toEqual(['zeroth', 'first'])
        })

        it('replaces every section', () => {
            table.replaceAllSections(section('only'))
            expect(table.sections.map(s => s.name)).toEqual(['only'])
        })

        it('replaces a range of sections', () => {
            table.addSections(section('second'), section('third'))
            table.replaceSections(1, 2, section('new'))
            expect(table.sections.map(s => s.name)).toEqual(['first', 'new', 'third'])
        })

        it('refuses a range that ends before it starts', () => {
            table.replaceSections(2, 1, section('new'))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })

        it('removes the sections at the indices given', () => {
            table.addSections(section('second'))
            table.removeSections(0)
            expect(table.sections.map(s => s.name)).toEqual(['second'])
        })

        it('removes every section when no index is given', () => {
            table.removeSections()
            expect(table.sections).toEqual([])
        })

        it('refuses a section whose rows do not match the columns', () => {
            table.addSections(section('bad', [[{ value: 1 }] as DataTableRowValue[]]))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })

        it('refuses an inserted section whose rows do not match the columns', () => {
            table.insertSections(0, section('bad', [[{ value: 1 }] as DataTableRowValue[]]))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })

        it('refuses a replacement section whose rows do not match the columns', () => {
            table.replaceAllSections(section('bad', [[{ value: 1 }] as DataTableRowValue[]]))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })

        it('refuses a section range that starts before the table', () => {
            table.replaceSections(-1, 1, section('new'))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })

        it('refuses the whole call when one section of it is invalid', () => {
            table.addSections(section('good'), section('bad', [[{ value: 1 }] as DataTableRowValue[]]))
            expect(table.sections.map(s => s.name)).toEqual(['first'])
        })
    })
})
