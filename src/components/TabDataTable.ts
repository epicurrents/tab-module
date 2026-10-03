/**
 * Epicurrents tab data table.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericResource } from '@epicurrents/core'
import type { DataTableColumnConfiguration, DataTableRowValue, DataTableSection } from '@epicurrents/core/types'
import type { TabularDataTable } from '#types'
import { Log } from 'scoped-event-log'
import { deepClone } from '@epicurrents/core/util'

const SCOPE = 'TabDataTable'
/**
 * Tabular data table.
 */
export default class TabDataTable extends GenericResource implements TabularDataTable {

    protected _configuration: DataTableColumnConfiguration[]
    protected _isMetadata = false
    protected _label: string
    protected _name: string
    protected _sections: DataTableSection[] = []

    /**
     * Create a new tabular data table.
     * @param name - Table name; this will be displayed in the UI.
     * @param configuration - Column configurations; every row of every section must match these in length and in cell type.
     * @param label - Table label for the UI, defaulting to `name`.
     * @param sections - Initial sections; an invalid one is refused and leaves the table empty.
     * @param isMetadata - Does this table hold metadata rather than data, which excludes it from summaries.
     */
    constructor (
        name: string,
        configuration: DataTableColumnConfiguration[],
        label?: string,
        sections?: DataTableSection[],
        isMetadata?: boolean,
    ) {
        super(name, 'tab')
        // A copy, not the array itself: the property setters replace an array's contents in place,
        // so a table holding the caller's array rewrites it from under the caller — and from under
        // every other table built from the same configuration.
        this._configuration = [...configuration]
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

    /**
     * Resolve the section that `section` designates, as both its position and its contents.
     *
     * The position is what the row methods write back through, because a name is not unique in a
     * table that has been given two sections carrying the same one: writing back by name would then
     * replace every section of that name with the one copy that was edited.
     * @param section - Index or name of the section.
     * @returns The section and its index, or null if the table has no such section.
     */
    protected _findSection (section: number | string) {
        const index = typeof section === 'number'
                      ? section
                      : this._sections.findIndex(sec => sec.name === section)
        const target = this._sections[index]
        return target ? { index, target } : null
    }

    /**
     * Put `replacement` in the place of the section at `index`, validating it on the way in.
     * @param index - Position of the section to replace.
     * @param replacement - The edited section.
     */
    protected _replaceSectionAt (index: number, replacement: DataTableSection) {
        this.sections = this._sections.map((section, i) => {
            return i === index ? replacement : section
        })
    }

    /**
     * Does every row of `section` match the column configuration in length and in cell type.
     * @param section - The section to check.
     */
    protected _sectionConfigurationIsValid (section: DataTableSection) {
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
                // An empty cell is the null itself, so the coalescing is on the cell and not on the
                // value it holds: a falsy value — a zero, an empty string, a false — is a value the
                // column has to accept or refuse like any other, not an absent one.
                const val = row[i]?.value ?? null
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
        const found = this._findSection(section)
        if (!found) {
            Log.error(`Cannot add rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(found.target)!
        newSection.rows.push(...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Adding rows failed due to invalid row configuration.`, SCOPE)
            return
        }
        this._replaceSectionAt(found.index, newSection)
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
        const found = this._findSection(section)
        if (!found) {
            Log.error(`Cannot insert rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(found.target)!
        newSection.rows.splice(start, 0, ...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Inserting rows to section '${section}' failed due to invalid row configuration.`, SCOPE)
            return
        }
        this._replaceSectionAt(found.index, newSection)
    }

    insertSections (start: number, ...sections: DataTableSection[]) {
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
        const found = this._findSection(section)
        if (!found) {
            Log.error(`Cannot remove rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(found.target)!
        newSection.rows = indices.length ? newSection.rows.filter((_, i) => !indices.includes(i)) : []
        this._replaceSectionAt(found.index, newSection)
    }

    removeSections (...indices: number[]) {
        this.sections = indices.length ? this._sections.filter((_, i) => !indices.includes(i)) : []
    }

    replaceAllRows (section: number | string, ...rows: DataTableRowValue[][]) {
        const found = this._findSection(section)
        if (!found) {
            Log.error(`Cannot replace all rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(found.target)!
        newSection.rows = rows
        this._replaceSectionAt(found.index, newSection)
    }

    replaceAllSections (...sections: DataTableSection[]) {
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
        const found = this._findSection(section)
        if (!found) {
            Log.error(`Cannot replace rows, section '${section}' not found.`, SCOPE)
            return
        }
        const newSection = deepClone(found.target)!
        newSection.rows.splice(start, Math.min(end, found.target.rows.length) - start, ...rows)
        if (!this._sectionConfigurationIsValid(newSection)) {
            Log.error(`Replacing rows failed due to invalid row configuration.`, SCOPE)
            return
        }
        this._replaceSectionAt(found.index, newSection)
    }

    replaceSections (start: number, end: number, ...sections: DataTableSection[]) {
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
