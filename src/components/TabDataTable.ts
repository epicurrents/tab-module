/**
 * Epicurrents tab data table.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericResource } from '@epicurrents/core'
import type { 
    TableColumnConfiguration,
    TableRowValue,
    TabularDataTable,
} from '#types'
import { Log } from 'scoped-event-log'

const SCOPE = "TabDataTable"
/**
 * Tabular data table.
 */
export default class TabDataTable extends GenericResource implements TabularDataTable {

    _configuration: TableColumnConfiguration[]
    _rows: TableRowValue[][] = []

    /**
     * Create a new tabular data table.
     * @param name - Table name; this will be displayed in the UI.
     */
    constructor (name: string, configuration: TableColumnConfiguration[]) {
        super(name, 'tab-data')
        this._configuration = configuration
    }

    get configuration () {
        return this._configuration
    }
    set configuration (value: TableColumnConfiguration[]) {
        this._setPropertyValue('configuration', value)
    }
    get rows () {
        return this._rows
    }
    set rows (value: TableRowValue[][]) {
        if (value.some(row => !this._rowConfigurationIsValid(row))) {
            return
        }
        this._setPropertyValue('rows', value)
    }

    _rowConfigurationIsValid (row: TableRowValue[]) {
        if (row.length !== this._configuration.length) {
            Log.error(
                `Row length (${row.length}) does not match the number of columns (${this._configuration.length}).`,
                SCOPE
            )
            return false
        }
        for (let i = 0; i < row.length; i++) {
            const col = this._configuration[i]
            const val = row[i]
            if (val.constructor !== col.contentType) {
                Log.error(
                    `Value type mismatch at column ${i}: expected ${col.contentType}, got ${val.constructor}.`,
                    SCOPE
                )
                return false
            }
        }
        return true
    }

    addRows (...rows: TableRowValue[][]) {
        for (const row of rows) {
            if (!this._rowConfigurationIsValid(row)) {
                Log.error(`Adding rows failed due to invalid row configuration.`, SCOPE)
                return
            }
        }
        this._setPropertyValue('rows', [...this._rows, ...rows])
    }

    clearRows () {
        this._setPropertyValue('rows', [])
    }

    insertRows (start: number, ...rows: TableRowValue[][]) {
        for (const row of rows) {
            if (!this._rowConfigurationIsValid(row)) {
                Log.error(`Inserting rows failed due to invalid row configuration.`, SCOPE)
                return
            }
        }
        this._setPropertyValue('rows', [
            ...this._rows.slice(0, start),
            ...rows,
            ...this._rows.slice(start)
        ])
    }

    removeRows (...indices: number[]) {
        this._setPropertyValue('rows', this._rows.filter((_, i) => !indices.includes(i)))
    }

    replaceAllRows (...rows: TableRowValue[][]) {
        for (const row of rows) {
            if (!this._rowConfigurationIsValid(row)) {
                Log.error(`Replacing all rows failed due to invalid row configuration.`, SCOPE)
                return
            }
        }
        this._setPropertyValue('rows', rows)
    }
    
    replaceRows (start: number, ...rows: TableRowValue[][]) {
        for (const row of rows) {
            if (!this._rowConfigurationIsValid(row)) {
                Log.error(`Replacing rows failed due to invalid row configuration.`, SCOPE)
                return
            }
        }
        this._setPropertyValue('rows', [
            ...this._rows.slice(0, start),
            ...rows,
            ...this._rows.slice(start + rows.length)
        ])
    }
}