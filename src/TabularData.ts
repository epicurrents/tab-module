/**
 * Epicurrents tab data module.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericDocumentResource, GenericResource } from '@epicurrents/core'
import type { DataResource, StudyContext } from '@epicurrents/core/dist/types'
import type { TabularDataResource, TabularDataService, TabularDataTable } from '#types'
import TabDataService from './service/TabDataService'
import TabDataTable from './components/TabDataTable'
import { DeepPartial } from '@epicurrents/core/dist/types/util'
import Log from 'scoped-event-log'

const SCOPE = "TabularData"
/**
 * Tabular data resource. This class exposes methods for accessing the descriptions and the data in the resource.
 */
export default class TabularData extends GenericDocumentResource implements TabularDataResource {

    protected _service: TabularDataService
    protected _subcontexts: Map<string, DataResource> = new Map()
    protected _tables: TabularDataTable[] = []
    /**
     * Create a new tabular data resource.
     * @param name - Resource name; this will be displayed in the UI.
     * @param source - Data source as a study context.
     * @param worker - Worker to use for data operations.
     */
    constructor (name: string, source: StudyContext, worker: Worker) {
        super(name, 'tab', 'tab', source)
        this._service = new TabDataService(worker)
        this._service.setupWorker(source).then((response) => {
            // Worker setup loads all the necessary data.
            console.log('response', response)
            if (response.success) {
                this._state = 'ready'
                for (const tableTemplate of response.tables) {
                    const table = new TabDataTable(
                        tableTemplate.name || `${this.name}-table-${this._tables.length + 1}`,
                        tableTemplate.configuration,
                        tableTemplate.label,
                    )
                    table.sections = tableTemplate.sections
                    this._tables.push(table)
                }
                if (response.studies) {
                    for (const [modality, studies] of Object.entries(response.studies)) {
                        Log.debug(`Loading ${studies.length} subcontext(s) for modality '${modality}'.`, SCOPE)
                        for (const study of studies) {
                            this.loadSubcontextFromTemplate(study).then((res) => {
                                if (study.id && res) {
                                    this.addSubcontexts([study.id, res])
                                }
                            })
                        }
                    }
                }
                this.dispatchPropertyChangeEvent('tables', this._tables, [])
            } else {
                this._state = 'error'
                this._errorReason = 'Failed to prepare worker.'
            }
        })
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
    set subcontexts (value: Map<string, DataResource>) {
        this._setPropertyValue('subcontexts', value)
        // Synchronize child resources.
        let anyChange = false
        const newChildResources = [] as DataResource[]
        for (const [, resource] of value) {
            newChildResources.push(resource)
            if (!this._childResources.find(r => r.id === resource.id)) {
                anyChange = true
            }
        }
        if (anyChange) {
            this.childResources = newChildResources
        }
    }

    get tables () {
        return this._tables
    }
    set tables (value: TabularDataTable[]) {
        this._setPropertyValue('tables', value)
    }

    addSubcontexts (...resources: [string, DataResource][]) {
        const newResources = resources.filter(([id, resource]) => {
            if (this._subcontexts.has(id)) {
                Log.debug(`Subcontext with key '${id}' already exists. Skipping addition.`, SCOPE)
                return false
            }
            if (this._childResources.find(r => r.id === resource.id)) {
                Log.debug(`Child resource with ID '${resource.id}' already exists. Skipping addition.`, SCOPE)
                return false
            }
            return true
        })
        const newSubcontexts = new Map(this._subcontexts)
        for (const [id, resource] of newResources) {
            newSubcontexts.set(id, resource)
        }
        this.childResources = [...this._childResources, ...newResources.map(([_, r]) => r)]
        this.subcontexts = newSubcontexts
    }

    addTables (...tables: TabularDataTable[]) {
        this.tables = [...this._tables, ...tables]
    }

    async loadSubcontextFromTemplate (template: DeepPartial<DataResource>): Promise<DataResource | null> {
        if (!window.__EPICURRENTS__?.RUNTIME?.MODULES) {
            Log.error(`Epicurrents runtime study modules are not available.`, SCOPE)
            return null
        }
        const module = window.__EPICURRENTS__.RUNTIME.MODULES.get(template.modality as string)
        if (!module) {
            Log.warn(
                `Cannot load subcontext; study module for modality '${template.modality}' is not available.`, SCOPE
            )
            return null
        }
        const resource = module.getResourceFromSerialized?.(template)
        console.log(resource)
        return resource || null
    }

    removeSubcontexts(...resources: (string | DataResource)[]) {
        const newChildResources = [] as DataResource[]
        const newSubcontexts = new Map<string, DataResource>()
        subcontext_loop:
        for (const [key, subctx] of this._subcontexts) {
            for (const s of resources) {
                if (typeof s === 'string' && s === key) {
                    continue subcontext_loop
                } else if ( typeof s !== 'string' && s.id === subctx.id) {
                    continue subcontext_loop
                }
            }
            newChildResources.push(subctx)
            newSubcontexts.set(key, subctx)
        }
        this.childResources = newChildResources
        this.subcontexts = newSubcontexts
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
    setActiveSubcontext (contextKey: string | null) {
        if (contextKey === null) {
            this._activeChildResource = null
            return
        }
        const resource = this._subcontexts.get(contextKey)
        if (!resource) {
            Log.error(`Cannot set active subcontext; no subcontext with key '${contextKey}' found.`, SCOPE)
            return
        }
        this.activeChildResource = resource
    }
}
