import type {
    AssetService,
    BaseAsset,
    BaseModuleSettings,
    DataResource,
    DataTableColumnConfiguration,
    DataTableRowValue,
    DataTableSection,
    DataTableTemplate,
    DocumentResource,
    StudyContext,
    TaskResponse,
} from "@epicurrents/core/dist/types"
import { DeepPartial } from "@epicurrents/core/dist/types/util"

export type GetRowsResponse = unknown[][] | null
export type GetTablesResponse = unknown[][] | null

export type TabDataModuleSettings = BaseModuleSettings
/**
 * Tabular data resource for storing and managing one or more data tables.
 */
export interface TabularDataResource extends DocumentResource {
    /** Asynchronously fetched tables from the worker. */
    content: Promise<TabularDataTable[]>
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
     * Set the active subcontext by its key. This will set the corresponding resource as the active sub-resource.
     * @param contextKey - Key of the subcontext to set as active, or null to clear the active subcontext.
     */
    setActiveSubcontext (contextKey: string | null): void
}
export interface TabularDataService extends AssetService {
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
 */
export interface TabularDataTable extends BaseAsset {
    /** Column configurations. */
    configuration: DataTableColumnConfiguration[]
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

export type SetupTabDataWorkerResponse = TaskResponse & {
    tables: DataTableTemplate[]
    studies?: Record<string, Partial<DataResource>[]>
}
