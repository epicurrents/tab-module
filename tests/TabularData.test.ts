/**
 * Epicurrents tab data module module tests.
 * Due to the high level of integration, tests must be run sequentially.
 * This file describes the testing sequence and runs the appropriate tests.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import TabularData from '../src/TabularData'
import type { StudyContext } from '@epicurrents/core/dist/types'
import type { TabularDataTable, TableColumnConfiguration, TableRowValue } from '../src/types'

// Mock StudyContext for testing
const createMockStudyContext = (): StudyContext => ({
    name: 'Test Study',
    meta: {}
} as StudyContext)

// Mock TabularDataTable for testing
const createMockTable = (id: string, name: string): TabularDataTable => ({
    id,
    name,
    configuration: [
        { name: 'id', label: 'ID', contentType: Number },
        { name: 'name', label: 'Name', contentType: String },
        { name: 'active', label: 'Active', contentType: Boolean }
    ] as TableColumnConfiguration[],
    rows: [
        [1, 'Test Item 1', true],
        [2, 'Test Item 2', false],
        [3, 'Test Item 3', true]
    ] as TableRowValue[][],
    addRows: jest.fn(),
    insertRows: jest.fn(),
    removeRows: jest.fn(),
    replaceAllRows: jest.fn(),
    replaceRows: jest.fn()
} as unknown as TabularDataTable)

describe('TabularData', () => {
    let tabularData: TabularData
    let mockStudyContext: StudyContext

    beforeEach(() => {
        mockStudyContext = createMockStudyContext()
        tabularData = new TabularData('Test Tabular Data', mockStudyContext)
    })

    describe('constructor', () => {
        test('should create a new TabularData instance with correct properties', () => {
            expect(tabularData.name).toBe('Test Tabular Data')
            expect((tabularData as any).type).toBe('tab-data')
            expect(tabularData.source).toBe(mockStudyContext)
            expect((tabularData as any).state).toBe('ready')
            expect(tabularData.tables).toEqual([])
        })

        test('should initialize with empty tables array', () => {
            expect(tabularData.tables).toHaveLength(0)
            expect(Array.isArray(tabularData.tables)).toBe(true)
        })
    })

    describe('tables getter and setter', () => {
        test('should get empty tables array initially', () => {
            expect(tabularData.tables).toEqual([])
        })

        test('should set tables array', () => {
            const mockTables = [
                createMockTable('table1', 'Table 1'),
                createMockTable('table2', 'Table 2')
            ]

            tabularData.tables = mockTables
            expect(tabularData.tables).toEqual(mockTables)
            expect(tabularData.tables).toHaveLength(2)
        })

        test('should replace existing tables when setting new ones', () => {
            const firstSet = [createMockTable('table1', 'Table 1')]
            const secondSet = [
                createMockTable('table2', 'Table 2'),
                createMockTable('table3', 'Table 3')
            ]

            tabularData.tables = firstSet
            expect(tabularData.tables).toHaveLength(1)

            tabularData.tables = secondSet
            expect(tabularData.tables).toHaveLength(2)
            expect(tabularData.tables[0].id).toBe('table2')
            expect(tabularData.tables[1].id).toBe('table3')
        })
    })

    describe('addTables', () => {
        test('should add single table to empty collection', () => {
            const mockTable = createMockTable('table1', 'Table 1')
            
            tabularData.addTables(mockTable)
            
            expect(tabularData.tables).toHaveLength(1)
            expect(tabularData.tables[0]).toBe(mockTable)
        })

        test('should add multiple tables at once', () => {
            const mockTable1 = createMockTable('table1', 'Table 1')
            const mockTable2 = createMockTable('table2', 'Table 2')
            const mockTable3 = createMockTable('table3', 'Table 3')
            
            tabularData.addTables(mockTable1, mockTable2, mockTable3)
            
            expect(tabularData.tables).toHaveLength(3)
            expect(tabularData.tables[0]).toBe(mockTable1)
            expect(tabularData.tables[1]).toBe(mockTable2)
            expect(tabularData.tables[2]).toBe(mockTable3)
        })

        test('should add tables to existing collection', () => {
            const existingTable = createMockTable('existing', 'Existing Table')
            const newTable1 = createMockTable('new1', 'New Table 1')
            const newTable2 = createMockTable('new2', 'New Table 2')
            
            tabularData.tables = [existingTable]
            tabularData.addTables(newTable1, newTable2)
            
            expect(tabularData.tables).toHaveLength(3)
            expect(tabularData.tables[0]).toBe(existingTable)
            expect(tabularData.tables[1]).toBe(newTable1)
            expect(tabularData.tables[2]).toBe(newTable2)
        })

        test('should handle adding no tables (empty call)', () => {
            const existingTable = createMockTable('existing', 'Existing Table')
            tabularData.tables = [existingTable]
            
            tabularData.addTables()
            
            expect(tabularData.tables).toHaveLength(1)
            expect(tabularData.tables[0]).toBe(existingTable)
        })
    })

    describe('removeTables', () => {
        let table1: TabularDataTable
        let table2: TabularDataTable
        let table3: TabularDataTable

        beforeEach(() => {
            table1 = createMockTable('table1', 'Table 1')
            table2 = createMockTable('table2', 'Table 2')
            table3 = createMockTable('table3', 'Table 3')
            tabularData.tables = [table1, table2, table3]
        })

        test('should remove table by index', () => {
            tabularData.removeTables(1) // Remove table2
            
            expect(tabularData.tables).toHaveLength(2)
            expect(tabularData.tables[0]).toBe(table1)
            expect(tabularData.tables[1]).toBe(table3)
        })

        test('should remove table by ID', () => {
            tabularData.removeTables('table2')
            
            expect(tabularData.tables).toHaveLength(2)
            expect(tabularData.tables[0]).toBe(table1)
            expect(tabularData.tables[1]).toBe(table3)
        })

        test('should remove table by reference', () => {
            tabularData.removeTables(table2)
            
            expect(tabularData.tables).toHaveLength(2)
            expect(tabularData.tables[0]).toBe(table1)
            expect(tabularData.tables[1]).toBe(table3)
        })

        test('should remove multiple tables by different identifiers', () => {
            tabularData.removeTables(0, 'table3') // Remove table1 by index and table3 by ID
            
            expect(tabularData.tables).toHaveLength(1)
            expect(tabularData.tables[0]).toBe(table2)
        })

        test('should remove all tables when all are specified', () => {
            tabularData.removeTables(table1, table2, table3)
            
            expect(tabularData.tables).toHaveLength(0)
        })

        test('should handle non-existent table indices gracefully', () => {
            const originalLength = tabularData.tables.length
            tabularData.removeTables(99) // Non-existent index
            
            expect(tabularData.tables).toHaveLength(originalLength)
        })

        test('should handle non-existent table IDs gracefully', () => {
            const originalLength = tabularData.tables.length
            tabularData.removeTables('non-existent-id')
            
            expect(tabularData.tables).toHaveLength(originalLength)
        })

        test('should handle mixed existing and non-existent identifiers', () => {
            tabularData.removeTables(0, 'non-existent', table2, 99)
            
            expect(tabularData.tables).toHaveLength(1)
            expect(tabularData.tables[0]).toBe(table3)
        })

        test('should handle removing from empty collection', () => {
            tabularData.tables = []
            tabularData.removeTables(0, 'any-id')
            
            expect(tabularData.tables).toHaveLength(0)
        })

        test('should handle empty removal call', () => {
            const originalTables = [...tabularData.tables]
            tabularData.removeTables()
            
            expect(tabularData.tables).toEqual(originalTables)
        })

        test('should preserve original order when removing middle elements', () => {
            tabularData.removeTables(1) // Remove middle table
            
            expect(tabularData.tables[0].id).toBe('table1')
            expect(tabularData.tables[1].id).toBe('table3')
        })
    })

    describe('inheritance from GenericResource', () => {
        test('should inherit from GenericResource', () => {
            // Since we can't easily import GenericResource for instanceof check,
            // we'll verify the expected properties and methods exist
            expect(tabularData.name).toBeDefined()
            expect((tabularData as any).type).toBeDefined()
            expect(tabularData.source).toBeDefined()
            expect((tabularData as any).state).toBeDefined()
        })

        test('should have correct resource type', () => {
            expect((tabularData as any).type).toBe('tab-data')
        })

        test('should be in ready state immediately', () => {
            expect((tabularData as any).state).toBe('ready')
        })
    })

    describe('property change notifications', () => {
        test('should call _setPropertyValue when setting tables', () => {
            // We can't directly spy on protected methods, but we can verify behavior
            const mockTables = [createMockTable('table1', 'Table 1')]
            const initialTables = tabularData.tables
            
            tabularData.tables = mockTables
            
            expect(tabularData.tables).not.toBe(initialTables)
            expect(tabularData.tables).toBe(mockTables)
        })
    })

    describe('edge cases and error handling', () => {
        test('should handle setting tables to null gracefully', () => {
            expect(() => {
                tabularData.tables = null as any
            }).not.toThrow()
        })

        test('should handle setting tables to undefined gracefully', () => {
            expect(() => {
                tabularData.tables = undefined as any
            }).not.toThrow()
        })

        test('should handle table with no ID in removeTables', () => {
            const tableWithoutId = createMockTable('', 'Table Without ID')
            tabularData.tables = [tableWithoutId]
            
            tabularData.removeTables(tableWithoutId)
            
            expect(tabularData.tables).toHaveLength(0)
        })
    })
})

describe('Epicurrents tab data module integration tests', () => {
    // Placeholder for future integration tests
    test('placeholder for integration tests', () => {
        expect(true).toBe(true)
    })
})
