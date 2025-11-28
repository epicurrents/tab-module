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

    protected _activeTable: TabularDataTable | null = null
    protected _monitorActiveTable = true
    /** Preliminary number of tables before loading the actual data. */
    protected _numTables = 0
    protected _service: TabularDataService
    protected _subcontexts: Map<string, DataResource> = new Map()
    protected _tables: TabularDataTable[] = []
    /**
     * Create a new tabular data resource.§
     * @param name - Resource name; this will be displayed in the UI.
     * @param source - Data source as a study context.
     * @param worker - Worker to use for data operations.
     */
    constructor (name: string, source: StudyContext, worker: Worker) {
        super(name, 'tab', 'tab', source)
        this._service = new TabDataService(worker)
        const meta = source.meta as Partial<TabularDataResource>
        if (meta?.numTables) {
            this._numTables = meta.numTables
        }
        // Load resource on activation.
        this.addEventListener(TabularData.EVENTS.ACTIVATE, async () => {
            if (this._service?.isReady || this._state !== 'ready') {
                return
            }
            this.dispatchEvent(TabularData.EVENTS.INITIAL_SETUP, 'before')
            const response = await this._service.setupWorker(source)
            // Worker setup loads all the necessary data.
            if (response.success) {
                for (const tableTemplate of response.tables) {
                    const table = new TabDataTable(
                        tableTemplate.name || `${this.name}-table-${this._tables.length + 1}`,
                        tableTemplate.configuration,
                        tableTemplate.label,
                        tableTemplate.sections,
                        tableTemplate.isMetadata,
                    )
                    this._tables.push(table)
                }
                this.dispatchPropertyChangeEvent('tables', this._tables, [])
                if (response.studies) {
                    const loaded = [] as DataResource[]
                    for (const [modality, studies] of Object.entries(response.studies!)) {
                        Log.debug(`Loading ${studies.length} subcontext(s) for modality '${modality}'.`, SCOPE)
                        loaded.push(...(await Promise.all(studies.map(study =>
                            this.loadSubcontextFromTemplate(study)
                        ))).filter(s => s && s.id) as DataResource[])
                    }
                    this.addSubcontexts(...loaded.map(s => [s!.id, s!] as [string, DataResource]))
                    // Notify about subcontext change.
                    this.dispatchPropertyChangeEvent('state', 'ready', 'ready')
                }
            } else {
                this.state = 'error'
                this.errorReason = 'Failed to prepare worker.'
            }
            this.dispatchEvent(TabularData.EVENTS.INITIAL_SETUP, 'after')
        }, this.id)
    }

    get activeTable () {
        return this._activeTable
    }
    set activeTable (value: TabularDataTable | null) {
        // Don't trigger event monitors.
        this._monitorActiveTable = false
        if (this._activeTable) {
            this._activeTable.isActive = false
        }
        if (value) {
            // This change should trigger a property change event via isActive monitoring.
            value.isActive = true
        }
        this._setPropertyValue('activeTable', value)
        this._monitorActiveTable = true
    }

    get content (): Promise<TabularDataTable[]> {
        // TODO: Fetch data from service and cache in local tables.
        return new Promise((_resolve => {
            return this._tables
        }))
    }

    get numTables () {
        return this._tables.filter(table => table.sections.length > 0 && !table.isMetadata).length || this._numTables
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
        for (const table of this._tables) {
            table.removeAllEventListeners(this.id)
        }
        this._tables.length = 0
        // Do this via addTables to ensure event monitoring is set up.
        this.addTables(...value)
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
        // Monitor new tables for changes in active state.
        for (const table of tables) {
            table.onPropertyChange('isActive', (newValue) => {
                if (!this._monitorActiveTable) {
                    return
                }
                if (newValue) {
                    // Deactivate other tables.
                    for (const otherTable of tables) {
                        if (otherTable !== table) {
                            otherTable.isActive = false
                        }
                    }
                    this._setPropertyValue('activeTable', newValue)
                } else if (this._activeTable?.id === table.id) {
                    this._setPropertyValue('activeTable', null)
                }
            }, this.id)
        }
        this._setPropertyValue('tables', [...this._tables, ...tables])
    }

    getMainProperties(): Map<any, any> {
        const props = super.getMainProperties()
        if (this._state === 'ready') {
                if (this._tables.length > 0) {
                props.set(
                    this.numTables.toString(),
                    {
                        icon: 'border-all',
                        n: this.numTables,
                        title: '{n} tables'
                    }
                )
                props.set(
                    this._subcontexts.size.toString(),
                    {
                        icon: 'wave',
                        n: this._subcontexts.size,
                        title: '{n} studies'
                    }
                )
            } else if (this.numTables > 0) {
                props.set(
                    this.numTables.toString(),
                    {
                        icon: 'border-all',
                        n: this.numTables,
                        title: '{n} tables'
                    }
                )
            }
        }
        return props
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
        return resource || null
    }

    async prepare (): Promise<boolean> {
        this.state = 'ready'
        return true
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

    setActiveTableByReference (table: number | string) {
        const resource = typeof table === 'number'
                       ? this.tables[table]
                       : this._tables.find(t => t.name === table)
        if (!resource) {
            Log.error(`Cannot set active table; no table with designator '${table}' was found.`, SCOPE)
            return
        }
        this.activeTable = resource
    }
}
