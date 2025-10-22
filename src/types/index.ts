import type {
    BaseAsset,
    BaseModuleSettings,
    DataResource,
    DocumentResource,
    StudyContext,
} from "@epicurrents/core/dist/types"

export type GetRowsResponse = unknown[][] | null
export interface TabularDataDataService {
    getRows (start: number, count?: number): Promise<GetRowsResponse>
}

export type TabDataModuleSettings = BaseModuleSettings
/**
 * Table column configuration.
 */
export type TableColumnConfiguration = {
    /** Value constructor type. */
    contentType: BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor
    /** Label for UI. */
    label: string
    /** Unique name for programmatic access. */
    name: string
    /** Number of decimal places for number values. */
    precision?: number
}
export type TableRowValue = boolean | number | string | Date
/**
 * Tabular data resource for storing and managing one or more data tables.
 */
export interface TabularDataResource extends DocumentResource {
    /** Currently active subcontext. */
    activeSubcontext: DataResource | null
    /** Asynchronously fetched tables from the worker. */
    content: Promise<TabularDataTable[]>
    /** Data resources that exist as subcontext for this tabular data resource. */
    subcontexts: DataResource[]
    /** Tables in the resource. */
    tables: TabularDataTable[]
    /**
     * Add one or more resources as subcontext for this tabular data resource.
     * @param resources - The resource(s) to add as subcontext(s).
     */
    addSubcontexts (...resources: DataResource[]): void
    /**
     * Add one or more new tables to the resource.
     * @param tables - Tables to add.
     */
    addTables (...tables: TabularDataTable[]): void
    /**
     * Remove one or more resources from this tabular data resource's subcontexts.
     * @param resources - Resource(s) to remove from subcontexts.
     */
    removeSubcontexts (...resources: DataResource[]): void
    /**
     * Remove one or more tables from the resource.
     * @param tables - Tables to remove. Can be table instances, table IDs, or table indices.
     */
    removeTables (...tables: (number | string | TabularDataTable)[]): void
}
/**
 * Tabular data study context with the meta properties that every resource should have.
 */
export type TabularDataStudyContext = StudyContext & {
    meta: StudyContext['meta'] & {
        /** Table column configurations. */
        columns: TableColumnConfiguration[]
        /** Data rows. Values must be in the same order as in the column configurations. Use null for empty values. */
        rows: TableRowValue[][]
    }
}
/**
 * A table for holding tabular data.
 */
export interface TabularDataTable extends BaseAsset {
    /** Column configurations. */
    configuration: TableColumnConfiguration[]
    /** Data rows. Values must be in the same order as in the column configurations. Use null for empty values. */
    rows: TableRowValue[][]
    /**
     * Add one or more new rows to the end of the table.
     * @param rows - Rows to add.
     */
    addRows (...rows: TableRowValue[][]): void
    /**
     * Insert one or more new rows into the table at the specified position.
     * @param start - Index at which to insert the new rows.
     * @param rows - Rows to insert.
     */
    insertRows (start: number, ...rows: TableRowValue[][]): void
    /**
     * Remove one or more rows from the table.
     * @param indices - Indices of the rows to remove.
     */
    removeRows (...indices: number[]): void
    /**
     * Replace all rows in the table with the specified rows. Functionally the same as setting the `rows` property.
     * @param rows - New rows.
     */
    replaceAllRows (...rows: TableRowValue[][]): void
    /**
     * Replace one or more rows in the table starting at the specified position. The number of rows replaced is equal
     * to the number of new rows provided, unless the end of the table is reached first.
     * @param start - Index at which to start replacing rows.
     * @param rows - New rows.
     */
    replaceRows (start: number, ...rows: TableRowValue[][]): void
}

export type SetupTabDataWorkerResponse = {
}
