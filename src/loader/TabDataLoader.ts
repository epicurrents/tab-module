/**
 * Epicurrents tab data loader.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericStudyLoader } from '@epicurrents/core'
import type {
    ConfigStudyLoader,
    FileFormatExporter,
    FileFormatImporter,
    FileSystemItem,
    StudyContext,
} from '@epicurrents/core/types'
import type { TabularDataResource } from '#types'
import TabularData from '#root/src/TabularData'
import { Log } from 'scoped-event-log'

const SCOPE = 'TabDataLoader'

export default class TabDataLoader extends GenericStudyLoader {
    constructor (name: string, importer: FileFormatImporter, exporter?: FileFormatExporter) {
        super(name, ['tab'], importer, exporter)
    }

    get resourceModality () {
        return 'tab'
    }

    async getResource (idx: number | string = -1): Promise<TabularDataResource | null> {
        const loaded = await super.getResource(idx)
        if (loaded) {
            return loaded as TabularDataResource
        } else if (!this._study) {
            return null
        }
        // Create a new resource from the loaded study.
        if (!this._study.name) {
            Log.error(
                `Cannot construct a tab data resource from given study context; it is missing required properties.`,
                SCOPE
            )
            return null
        }
        // The worker is the consumer's: this package ships none, so the importer is asked for the
        // one registered under this loader's own modality. A consumer that registers none gets a
        // refusal here rather than a resource with no source to read.
        const worker = this._studyImporter?.getFileTypeWorker(`tab-${this.supportedModalities[0]}`)
        if (!worker) {
            Log.error(`Study loader does not have a file worker.`, SCOPE)
            return null
        }
        const tab = new TabularData(
            this._study.name,
            this._study,
            worker,
        )
        tab.source = this._study
        this._resources.push(tab)
        // Clear the loaded study.
        this._study = null
        return tab
    }

    async loadFromDirectory (dir: FileSystemItem, config?: ConfigStudyLoader): Promise<StudyContext | null> {
        const context = await super.loadFromDirectory(dir, config)
        if (!context) {
            return null
        }
        context.modality = 'tab'
        return context
    }

    async loadFromUrl (fileUrl: string, config?: ConfigStudyLoader, preStudy?: StudyContext) {
        const context = await super.loadFromUrl(fileUrl, config, preStudy)
        if (!context) {
            return null
        }
        context.modality = 'tab'
        return context
    }
}
