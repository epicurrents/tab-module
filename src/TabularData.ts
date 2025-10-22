/**
 * Epicurrents tab data module.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericDocumentResource, GenericResource } from '@epicurrents/core'
import type { DataResource, StudyContext } from '@epicurrents/core/dist/types'
import type { TabularDataResource, TabularDataTable } from '#types'
//import Log from 'scoped-event-log'

//const SCOPE = "TabularData"
/**
 * Tabular data resource. This class exposes methods for accessing the descriptions and the data in the resource.
 */
export default class TabularData extends GenericDocumentResource implements TabularDataResource {

    protected _activeSubcontext: DataResource | null = null
    protected _subcontexts: DataResource[] = []
    protected _tables: TabularDataTable[] = []
    /**
     * Create a new tabular data resource.
     * @param name - Resource name; this will be displayed in the UI.
     * @param source - Data source as a study context.
     */
    constructor (name: string, source: StudyContext) {
        super(name, 'tab-data', 'tab-data', source)
        // Tabular data is immediately ready since it doesn't use a worker.
        this._state = 'ready'
    }

    get activeSubcontext () {
        return this._activeSubcontext
    }
    set activeSubcontext (value: DataResource | null) {
        this._setPropertyValue('activeSubcontext', value)
    }

    get content (): Promise<TabularDataTable[]> {
        // TODO: Fetch data from service and cache in local tables.
        return new Promise((_resolve => {
            return this._tables
        }))
    }

    get subcontexts () {
        return this._subcontexts
    }
    set subcontexts (value: DataResource[]) {
        this._setPropertyValue('subcontexts', value)
    }

    get tables () {
        return this._tables
    }
    set tables (value: TabularDataTable[]) {
        this._setPropertyValue('tables', value)
    }

    addSubcontexts(...resources: DataResource[]) {
        this.subcontexts = [...this.subcontexts, ...resources]
    }

    removeSubcontexts(...resources: DataResource[]) {
        const newSubcontexts = []
        subcontext_loop:
        for (let i=0; i<this._subcontexts.length; i++) {
            const subcnt = this._subcontexts[i]
            for (const s of resources) {
                if (s.id === subcnt.id) {
                    continue subcontext_loop
                }
            }
            newSubcontexts.push(subcnt)
        }
        this.subcontexts = newSubcontexts
    }

    addTables (...tables: TabularDataTable[]) {
        this.tables = [...this._tables, ...tables]
    }

    removeTables (...tables: (number | string | TabularDataTable)[]) {
        const newTables = []
        table_loop:
        for (let i=0; i<this._tables.length; i++) {
            const table = this._tables[i]
            for (const t of tables) {
                if (
                    typeof t === 'number' && t === i ||
                    typeof t === 'string' && t === table.id ||
                    t instanceof GenericResource && t.id === table.id
                ) {
                    continue table_loop
                }
            }
            newTables.push(table)
        }
        this.tables = newTables
    }
}
