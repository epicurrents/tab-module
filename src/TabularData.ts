/**
 * Epicurrents tab data resource.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericDocumentResource } from '@epicurrents/core'
import type {
    AnnotationLabel,
    DataResource,
    DeepPartial,
    StudyContext,
} from '@epicurrents/core/types'
import type {
    TabularDataResource,
    TabularDataService,
    TabularDataTable,
} from '#types'
import TabDataService from '#service/TabDataService'
import TabDataTable from '#components/TabDataTable'
import { Log } from 'scoped-event-log'

const SCOPE = 'TabularData'
/**
 * Tabular data resource. This class exposes methods for accessing the descriptions and the data in the resource.
 */
export default class TabularData extends GenericDocumentResource implements TabularDataResource {

    protected _activeTable: TabularDataTable | null = null
    /** The load in flight, which a second caller joins rather than starting another. */
    protected _loading: Promise<void> | null = null
    protected _monitorActiveTable = true
    /** Preliminary number of tables before loading the actual data. */
    protected _numTables = 0
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
        const meta = source.meta as Partial<TabularDataResource>
        if (meta?.numTables) {
            this._numTables = meta.numTables
        }
        // Load resource on activation.
        this.addEventListener(TabularData.EVENTS.ACTIVATE, () => {
            if (this._service.isReady || this._state !== 'ready') {
                return
            }
            // A listener returns nothing, so the load reports its own outcome through the resource
            // state and the promise is dropped deliberately rather than by omission.
            void this.loadStudyData()
        }, this.id)
        // Send updated labels to service.
        this.onPropertyChange('labels', (value) => {
            // This one has no caller to report to, so the rejection is handled here. Left alone it
            // is an unhandled rejection in an event handler, which no consumer can catch.
            this._service.saveAnnotations({
                events: [],
                id: this.datasetId || this.name,
                labels: value as AnnotationLabel[],
            }).catch((reason: unknown) => {
                Log.error(`Saving the updated labels failed: ${String(reason)}`, SCOPE)
            })
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
        // The tables are already here: the worker setup loads them and the resource keeps them, so
        // there is nothing left to fetch. The property is a promise because the document interface
        // declares it as one, and it has to settle — a consumer awaits it with nothing to time out.
        return Promise.resolve(this._tables)
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
        if (!Array.isArray(value)) {
            return
        }
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
        this.childResources = [...this._childResources, ...newResources.map(([, r]) => r)]
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
                    // Deactivate the other tables of the resource, not just the ones added in the
                    // same call: a table from an earlier call would otherwise stay active beside
                    // this one, and two active tables is a state the setter cannot produce.
                    for (const otherTable of this._tables) {
                        if (otherTable !== table) {
                            otherTable.isActive = false
                        }
                    }
                    // The table itself, not the new value of its `isActive` property, which is the
                    // boolean this handler was called with.
                    this._setPropertyValue('activeTable', table)
                } else if (this._activeTable?.id === table.id) {
                    this._setPropertyValue('activeTable', null)
                }
            }, this.id)
        }
        this._setPropertyValue('tables', [...this._tables, ...tables])
    }

    getMainProperties () {
        const props = super.getMainProperties()
        if (this._state !== 'ready') {
            return props
        }
        // The contract of the map: each key is the message to translate and its value carries the
        // parameters that interpolate into it. Keying by the count instead leaves the number to be
        // rendered by itself, and makes two properties counting the same thing collide into one.
        if (this.numTables) {
            props.set('{n} tables', { n: this.numTables })
        }
        if (this._subcontexts.size) {
            props.set('{n} studies', { n: this._subcontexts.size })
        }
        return props
    }

    async loadStudyData (source: StudyContext = this._source as StudyContext) {
        if (this._loading) {
            // The setup commission is what loads the data, and a second one would build the tables
            // of the first reply a second time. It would also replace the setup waiter list, leaving
            // everything that joined the first load waiting on a list nothing notifies.
            Log.debug(`Study data is already loading, joining the load in progress.`, SCOPE)
            return this._loading
        }
        this._loading = this._loadStudyData(source)
        try {
            await this._loading
        } finally {
            this._loading = null
        }
    }

    /**
     * Commission the worker for `source` and build the resource from its reply.
     *
     * The outcome is reported through the resource state: a refused setup leaves it in the error
     * state carrying the worker's reason.
     * @param source - The study source to set the worker up for.
     */
    protected async _loadStudyData (source: StudyContext) {
        this.dispatchEvent(TabularData.EVENTS.INITIAL_SETUP, 'before')
        const response = await this._service.setupWorker(source)
        // Worker setup loads all the necessary data.
        if (response.success) {
            const tables = response.tables.map((template, i) => new TabDataTable(
                template.name || `${this.name}-table-${this._tables.length + i + 1}`,
                template.configuration,
                template.label,
                template.sections,
                template.isMetadata,
            ))
            // Through `addTables` rather than into the array: that method is what registers the
            // active-state monitor on each table, without which activating one of them neither
            // deactivates the others nor reaches `activeTable`.
            this.addTables(...tables)
            if (response.studies) {
                const loaded = [] as DataResource[]
                for (const [modality, studies] of Object.entries(response.studies)) {
                    Log.debug(`Loading ${studies.length} subcontext(s) for modality '${modality}'.`, SCOPE)
                    const templates = studies.map(study => this.loadSubcontextFromTemplate(study))
                    const resources = await Promise.all(templates)
                    // A template whose module is not registered resolves null, and one that resolved
                    // a resource without an id cannot be keyed into the subcontext map.
                    loaded.push(...resources.filter(resource => resource?.id) as DataResource[])
                }
                this.addSubcontexts(...loaded.map(s => [s.id, s] as [string, DataResource]))
                // Notify about subcontext change.
                this.dispatchPropertyChangeEvent('state', 'ready', 'ready')
            }
        } else {
            this.state = 'error'
            this.errorReason = response.message || 'Failed to prepare worker.'
        }
        this.dispatchEvent(TabularData.EVENTS.INITIAL_SETUP, 'after')
    }

    loadSubcontextFromTemplate (template: DeepPartial<DataResource>): Promise<DataResource | null> {
        if (!window.__EPICURRENTS__?.RUNTIME?.MODULES) {
            Log.error(`Epicurrents runtime study modules are not available.`, SCOPE)
            return Promise.resolve(null)
        }
        const module = window.__EPICURRENTS__.RUNTIME.MODULES.get(template.modality as string)
        if (!module) {
            Log.warn(
                `Cannot load subcontext; study module for modality '${template.modality}' is not available.`, SCOPE
            )
            return Promise.resolve(null)
        }
        const resource = module.getResourceFromSerialized?.(template)
        return Promise.resolve(resource || null)
    }

    prepare (): Promise<boolean> {
        this.state = 'ready'
        return Promise.resolve(true)
    }

    removeSubcontexts (...resources: (string | DataResource)[]) {
        const removed = [] as DataResource[]
        const newSubcontexts = new Map<string, DataResource>()
        subcontext_loop:
        for (const [key, subctx] of this._subcontexts) {
            for (const s of resources) {
                if (typeof s === 'string' && s === key) {
                    removed.push(subctx)
                    continue subcontext_loop
                } else if (typeof s !== 'string' && s.id === subctx.id) {
                    removed.push(subctx)
                    continue subcontext_loop
                }
            }
            newSubcontexts.set(key, subctx)
        }
        // Only the resources actually removed are dropped from the child list. Rebuilding that list
        // from the remaining subcontexts instead discards every child this resource did not add as
        // a subcontext itself, which is not what removing one of them asks for.
        this.childResources = this._childResources.filter(r => !removed.find(gone => gone.id === r.id))
        this.subcontexts = newSubcontexts
    }

    removeTables (...tables: (number | string | TabularDataTable)[]) {
        const newTables = []
        table_loop:
        for (let i = 0; i < this._tables.length; i++) {
            const table = this._tables[i]
            for (const t of tables) {
                if (
                    typeof t === 'number' && t === i ||
                    typeof t === 'string' && t === table.id ||
                    typeof t === 'object' && t !== null && t.id === table.id
                ) {
                    continue table_loop
                }
            }
            newTables.push(table)
        }
        this.tables = newTables
    }

    saveAnnotationsToDataset () {
        return this._service.saveAnnotations({
            events: [],
            id: this.id,
            labels: this.labels,
        })
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
