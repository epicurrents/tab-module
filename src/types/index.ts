/**
 * Epicurrents tab data module types.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import type {
    AnnotationLabel,
    AssetService,
    BaseAsset,
    BaseModuleSettings,
    DataResource,
    DataTableColumnConfiguration,
    DataTableRowValue,
    DataTableSection,
    DataTableTemplate,
    DeepPartial,
    DocumentResource,
    StudyContext,
    TaskResponse,
} from '@epicurrents/core/types'

/** Rows the worker returned, or null if it had none to give. */
export type GetRowsResponse = unknown[][] | null
/**
 * Reply to the `setup-worker` commission.
 *
 * The table templates are the worker's answer to the whole setup, not a later commission: a resource
 * builds its tables from them as the setup resolves. `studies` names the subcontexts the source
 * carries, keyed by modality, each one a template for the resource module of that modality.
 */
export type SetupTabDataWorkerResponse = TaskResponse & {
    tables: DataTableTemplate[]
    studies?: Record<string, Partial<DataResource>[]>
}
export type TabDataModuleSettings = BaseModuleSettings
/**
 * Tabular data resource for storing and managing one or more data tables.
 */
export interface TabularDataResource extends DocumentResource {
    /** Currently active table in the resource. */
    activeTable: TabularDataTable | null
    /** Promise that resolves with the tables of the resource. */
    content: Promise<TabularDataTable[]>
    /** Number of tables in the resource. */
    numTables: number
    /**
     * Data resources that exist as subcontext for this tabular data resource.
     * This is essentially a map from resource keys to child resources.
     */
    subcontexts: Map<string, DataResource>
    /** Tables in the resource. */
    tables: TabularDataTable[]
    /**
     * Add one or more resources as subcontext for this tabular data resource.
     * @param resources - The resource(s) to add as [key, subcontext](s).
     */
    addSubcontexts (...resources: [string, DataResource][]): void
    /**
     * Add one or more new tables to the resource.
     * @param tables - Tables to add.
     */
    addTables (...tables: TabularDataTable[]): void
    /**
     * Load the data for this resource from the given study `source`.
     *
     * The outcome is reported through the resource state rather than returned: a source the worker
     * cannot set up leaves the resource in the error state with the reason the worker gave.
     * @param source - The study source to use (defaults to cached study).
     */
    loadStudyData (source?: StudyContext): Promise<void>
    /**
     * Load the subcontext from the given template and add it to this resource.
     * @param template - The template to load.
     * @returns A promise that resolves to the loaded subcontext or null if not found.
     */
    loadSubcontextFromTemplate (template: DeepPartial<DataResource>): Promise<DataResource | null>
    /**
     * Remove one or more resources from this tabular data resource's subcontexts.
     * @param resources - Resource(s) or resource key(s) to remove from subcontexts.
     */
    removeSubcontexts (...resources: (string | DataResource)[]): void
    /**
     * Remove one or more tables from the resource.
     * @param tables - Tables to remove. Can be table instances, table IDs, or table indices.
     */
    removeTables (...tables: (number | string | TabularDataTable)[]): void
    /**
     * Save current annotations to the dataset.
     * @returns A promise that resolves (or rejects) when the annotations have been saved.
     */
    saveAnnotationsToDataset (): Promise<void>
    /**
     * Set the active subcontext by its key. This will set the corresponding resource as the active sub-resource.
     * @param contextKey - Key of the subcontext to set as active, or null to clear the active subcontext.
     */
    setActiveSubcontext (contextKey: string | null): void
    /**
     * Set the active table by its index or name.
     * @param table - Index or name of the table to set as active.
     */
    setActiveTableByReference (table: number | string): void
}
/**
 * Service that holds the worker a tabular data resource reads through.
 *
 * The worker is not part of this package; a consumer registers one with its study importer and the
 * study loader hands it over. The commissions are `setup-worker`, `get-rows` and `save-annotations`.
 */
export interface TabularDataService extends AssetService {
    /**
     * Read a range of rows from the source.
     * @param start - Index of the first row to read.
     * @param count - Number of rows to read; the worker decides the extent when this is omitted.
     * @returns A promise that resolves with the rows, or with null if the worker had none to give.
     */
    getRows (start: number, count?: number): Promise<GetRowsResponse>
    /**
     * Save the given annotations to the source.
     * @param annotations - The events and labels to save, and the id of the dataset to save them to.
     * @returns A promise that resolves when the annotations have been saved, and rejects with the reason if not.
     */
    saveAnnotations (
        annotations: {
            events: unknown[],
            id: string,
            labels: AnnotationLabel[],
        }
    ): Promise<void>
    /**
     * Set up the worker against the given study, which is also what loads the data.
     * @param study - The study to set the worker up for.
     * @returns A promise that resolves with the reply, failures included; it does not reject.
     */
    setupWorker (study: StudyContext): Promise<SetupTabDataWorkerResponse>
}
/**
 * Tabular data study context with the meta properties that every resource should have.
 */
export type TabularDataStudyContext = StudyContext & {
    meta: StudyContext['meta'] & {
        /** Table column configurations. */
        columns: DataTableColumnConfiguration[]
        /** Data rows. Values must be in the same order as in the column configurations. Use null for empty values. */
        sections: DataTableSection[]
    }
}
/**
 * A table for holding tabular data.
 *
 * Every mutation is validated against the column configuration and refused as a whole if a row does
 * not match it in length or in cell type, so a table always renders against its own configuration.
 * A section is addressed by name or by position; the names are expected to be unique within a table.
 */
export interface TabularDataTable extends BaseAsset {
    /** Column configurations. */
    configuration: DataTableColumnConfiguration[]
    /** Indicates if the table contains metadata. */
    isMetadata: boolean
    /** Table label. */
    label: string
    /** Data rows. Values must be in the same order as in the column configurations. Use null for empty values. */
    sections: DataTableSection[]
    /**
     * Add one or more new rows to the end of the table.
     * @param section - Index or name of the section to which to add the new rows.
     * @param rows - Rows to add.
     */
    addRows (section: number | string, ...rows: DataTableRowValue[][]): void
    /**
     * Add one or more new sections to the end of the table.
     * @param sections - Sections to add.
     */
    addSections (...sections: DataTableSection[]): void
    /**
     * Insert one or more new rows into the table at the specified position.
     * @param section - Index or name of the section in which to insert the new rows.
     * @param start - Index at which to insert the new rows.
     * @param rows - Rows to insert.
     */
    insertRows (section: number | string, start: number, ...rows: DataTableRowValue[][]): void
    /**
     * Insert one or more new sections into the table at the specified position.
     * @param start - Index at which to insert the new sections.
     * @param sections - Sections to insert.
     */
    insertSections (start: number, ...sections: DataTableSection[]): void
    /**
     * Remove one or more rows from the table.
     * @param section - Index or name of the section from which to remove the rows.
     * @param indices - Indices of the rows to remove. An empty parameter removes all rows.
     */
    removeRows (section: number | string, ...indices: number[]): void
    /**
     * Remove one or more sections from the table.
     * @param indices - Indices of the sections to remove. An empty parameter removes all sections.
     */
    removeSections (...indices: number[]): void
    /**
     * Replace all rows in the table with the specified rows. Functionally the same as setting the `rows` property.
     * @param section - Index or name of the section in which to replace the rows.
     * @param rows - New rows.
     */
    replaceAllRows (section: number | string, ...rows: DataTableRowValue[][]): void
    /**
     * Replace all sections in the table with the specified sections.
     * @param sections - New section(s).
     */
    replaceAllSections (...sections: DataTableSection[]): void
    /**
     * Replace one or more rows in the table starting at the specified position.
     * @param section - Index or name of the section in which to replace the rows.
     * @param start - Index at which to start replacing rows.
     * @param end - Index at which to stop replacing rows.
     * @param rows - New rows.
     */
    replaceRows (section: number | string, start: number, end: number, ...rows: DataTableRowValue[][]): void
    /**
     * Replace one or more sections in the table starting at the specified position.
     * @param start - Index at which to start replacing sections.
     * @param end - Index at which to stop replacing sections.
     * @param sections - New section(s).
     */
    replaceSections (start: number, end: number, ...sections: DataTableSection[]): void
}
