/**
 * Epicurrents tab data table.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericResource } from '@epicurrents/core'
import type { DataTableColumnConfiguration, DataTableRowValue, DataTableSection } from '@epicurrents/core/dist/types'
import type { TabularDataTable } from '#types'
import { Log } from 'scoped-event-log'
import { deepClone } from '@epicurrents/core/dist/util'

const SCOPE = "TabDataTable"
/**
 * Tabular data table.
 */
export default class TabDataTable extends GenericResource implements TabularDataTable {

    _configuration: DataTableColumnConfiguration[]
    _isMetadata = false
    _label: string
    _name: string
    _sections: DataTableSection[] = []

    /**
     * Create a new tabular data table.
     * @param name - Table name; this will be displayed in the UI.
     */
    constructor (
        name: string,
        configuration: DataTableColumnConfiguration[],
        label?: string,
        sections?: DataTableSection[],
        isMetadata?: boolean,
    ) {
        super(name, 'tab')
        this._configuration = configuration
        this._label = label || name
        this._name = name
        this._isMetadata = isMetadata || false
        if (sections) {
            this.replaceAllSections(...sections)
        }
    }

    get configuration () {
        return this._configuration
    }
    set configuration (value: DataTableColumnConfiguration[]) {
        this._setPropertyValue('configuration', value)
    }

    get isMetadata () {
        return this._isMetadata
    }
    set isMetadata (value: boolean) {
        this._setPropertyValue('isMetadata', value)
    }

    get label () {
        return this._label
    }
    set label (value: string) {
        this._setPropertyValue('label', value)
    }

    get name () {
        return this._name
    }
    set name (value: string) {
        this._setPropertyValue('name', value)
    }

    get sections () {
        return this._sections
    }
    set sections (value: DataTableSection[]) {
        if (value.some(section => !this._sectionConfigurationIsValid(section))) {
            Log.error(`Setting sections failed due to invalid section configuration.`, SCOPE)
            return
        }
        this._setPropertyValue('sections', value)
    }

    _sectionConfigurationIsValid (section: DataTableSection) {
        for (const row of section.rows) {
            if (row.length !== this._configuration.length) {
                Log.error(
                    `Row length (${
                        row.length
                    }) in section '${
                        section.name
                    }' does not match the number of columns (${
                        this._configuration.length
                    }).`,
                    SCOPE
                )
                return false
            }
            for (let i = 0; i < row.length; i++) {
                const col = this._configuration[i]
                const val = row[i]?.value || null
                if (val !== null && val.constructor !== col.contentType) {
                    Log.error(
                        `Value type mismatch at column ${i} '${col.name}': ` +
                        `expected ${col.contentType.name}, got ${val.constructor.name}.`,
                        SCOPE
                    )
                    return false
                }
            }
        }
        return true
    }

    addRows (section: number | string, ...rows: DataTableRowValue[][]) {
        const targetSection = typeof section === 'number'
                            ? this._sections[section] 
                            : this._sections.find(sec => sec.name === section)
        if (!targetSection) {
            Log.error(`Cannot add rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(targetSection)!
        newSection.rows.push(...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Adding rows failed due to invalid row configuration.`, SCOPE)
            return
        }
        this.sections = this._sections.map(sec => 
            sec.name === newSection.name ? newSection : sec
        )
    }

    addSections (...sections: DataTableSection[]) {
        for (const section of sections) {
            if (!this._sectionConfigurationIsValid(section)) {
                Log.error(`Adding section '${section.name}' failed due to invalid section configuration.`, SCOPE)
                return
            }
        }
        this.sections = [...this._sections, ...sections]
    }

    insertRows (section: number | string, start: number, ...rows: DataTableRowValue[][]) {
        const targetSection = typeof section === 'number'
                            ? this._sections[section] 
                            : this._sections.find(sec => sec.name === section)
        if (!targetSection) {
            Log.error(`Cannot insert rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(targetSection)!
        newSection.rows.splice(start, 0, ...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Inserting rows to section '${section}' failed due to invalid row configuration.`, SCOPE)
            return
        }
        this.sections = this._sections.map(sec => 
            sec.name === newSection.name ? newSection : sec
        )
    }

    insertSections(start: number, ...sections: DataTableSection[]): void {
        for (const section of sections) {
            if (!this._sectionConfigurationIsValid(section)) {
                Log.error(`Inserting section '${section.name}' failed due to invalid section configuration.`, SCOPE)
                return
            }
        }
        this.sections = [
            ...this._sections.slice(0, start),
            ...sections,
            ...this._sections.slice(start)
        ]
    }

    removeRows (section: number | string, ...indices: number[]) {
        const targetSection = typeof section === 'number'
                            ? this._sections[section] 
                            : this._sections.find(sec => sec.name === section)
        if (!targetSection) {
            Log.error(`Cannot remove rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(targetSection)!
        newSection.rows = indices.length ? newSection.rows.filter((_, i) => !indices.includes(i)) : []
        this.sections = this._sections.map(sec => 
            sec.name === newSection.name ? newSection : sec
        )
    }

    removeSections (...indices: number[]) {
        this.sections = indices.length ? this._sections.filter((_, i) => !indices.includes(i)) : []
    }

    replaceAllRows (section: number | string, ...rows: DataTableRowValue[][]) {
        const targetSection = typeof section === 'number'
                            ? this._sections[section] 
                            : this._sections.find(sec => sec.name === section)
        if (!targetSection) {
            Log.error(`Cannot replace all rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(targetSection)!
        newSection.rows = rows
        this.sections = this._sections.map(sec => 
            sec.name === newSection.name ? newSection : sec
        )
    }

    replaceAllSections(...sections: DataTableSection[]): void {
        for (const section of sections) {
            if (!this._sectionConfigurationIsValid(section)) {
                Log.error(`Replacing all sections failed due to invalid section configuration.`, SCOPE)
                return
            }
        }
        this.sections = sections
    }

    replaceRows (section: number | string, start: number, end: number, ...rows: DataTableRowValue[][]) {
        if (start < 0 || end < start) {
            Log.error(`Invalid start (${start}) or end (${end}) index for replacing rows.`, SCOPE)
            return
        }
        const targetSection = typeof section === 'number'
                            ? this._sections[section] 
                            : this._sections.find(sec => sec.name === section)
        if (!targetSection) {
            Log.error(`Cannot replace rows, section '${section}' not found.`, SCOPE)
            return
        }
        end = Math.min(end, targetSection.rows.length)
        const newSection = deepClone(targetSection)!
        newSection.rows.splice(start, end - start, ...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Replacing rows failed due to invalid row configuration.`, SCOPE)
            return
        }
        this.sections = this._sections.map(sec => 
            sec.name === newSection.name ? newSection : sec
        )
    }

    replaceSections(start: number, end: number, ...sections: DataTableSection[]): void {
        if (start < 0 || end < start) {
            Log.error(`Invalid start (${start}) or end (${end}) index for replacing sections.`, SCOPE)
            return
        }
        this.sections = [
            ...this._sections.slice(0, start),
            ...sections,
            ...this._sections.slice(end)
        ]
    }
}
