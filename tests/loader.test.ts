// @vitest-environment jsdom
/**
 * Tests for the study loader.
 *
 * The loader's own work is small: it stamps the modality onto whatever the generic loader returns
 * and constructs the resource, which is the step that needs a worker. The cases are about the
 * refusals, because each of them is a path that returns null rather than a half-built resource.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenericStudyLoader } from '@epicurrents/core'
import type { FileFormatImporter, FileSystemItem, StudyContext } from '@epicurrents/core/types'
import { installRuntime, removeRuntime, workerDouble } from './double'

import TabDataLoader from '#loader/TabDataLoader'
import TabularData from '#root/src/TabularData'

const study = () => ({ meta: {}, name: 'Test study' }) as StudyContext

/** An importer that answers the worker request the loader makes, and records the key it used. */
const importerDouble = (worker: Worker | null) => {
    const requested = [] as (string | undefined)[]
    const importer = {
        getFileTypeWorker: (override?: string) => {
            requested.push(override)
            return worker
        },
        registerStudyLoader: () => undefined,
        studyLoader: null,
    }
    return { importer: importer as unknown as FileFormatImporter, requested }
}

let loader: TabDataLoader

const makeLoader = (worker: Worker | null = workerDouble().asWorker) => {
    const { importer, requested } = importerDouble(worker)
    loader = new TabDataLoader('tab', importer)
    return requested
}

/** Put a loaded study on the loader, as the generic loader does before a resource is requested. */
const withStudy = (context: StudyContext | null = study()) => {
    ;(loader as unknown as { _study: StudyContext | null })._study = context
}

describe('TabDataLoader', () => {
    beforeEach(() => {
        installRuntime()
        makeLoader()
    })
    afterEach(() => {
        removeRuntime()
        vi.restoreAllMocks()
    })

    it('loads tabular data', () => {
        expect(loader.resourceModality).toBe('tab')
        expect(loader.supportedModalities).toEqual(['tab'])
    })

    describe('building the resource', () => {
        it('constructs a resource from the loaded study', async () => {
            withStudy()
            const resource = await loader.getResource()
            expect(resource).toBeInstanceOf(TabularData)
            expect(resource?.name).toBe('Test study')
        })

        it('keeps the resource and clears the study it was built from', async () => {
            withStudy()
            const resource = await loader.getResource()
            expect((loader as unknown as { _study: unknown })._study).toBe(null)
            expect(await loader.getResource(0)).toBe(resource)
        })

        it('asks the importer for the worker of its own modality', async () => {
            const requested = makeLoader()
            withStudy()
            await loader.getResource()
            expect(requested).toEqual(['tab-tab'])
        })

        it('answers null when no study has been loaded', async () => {
            await expect(loader.getResource()).resolves.toBe(null)
        })

        it('answers null when the study has no name', async () => {
            withStudy({ meta: {} } as StudyContext)
            await expect(loader.getResource()).resolves.toBe(null)
        })

        it('answers null when the importer has no worker to give', async () => {
            makeLoader(null)
            withStudy()
            await expect(loader.getResource()).resolves.toBe(null)
        })
    })

    describe('stamping the modality', () => {
        it('marks a study loaded from a url', async () => {
            vi.spyOn(GenericStudyLoader.prototype, 'loadFromUrl').mockResolvedValue(study())
            const context = await loader.loadFromUrl('https://example.test/table.csv')
            expect(context?.modality).toBe('tab')
        })

        it('marks a study loaded from a directory', async () => {
            vi.spyOn(GenericStudyLoader.prototype, 'loadFromDirectory').mockResolvedValue(study())
            const context = await loader.loadFromDirectory({} as FileSystemItem)
            expect(context?.modality).toBe('tab')
        })

        it('passes a refused url through', async () => {
            vi.spyOn(GenericStudyLoader.prototype, 'loadFromUrl').mockResolvedValue(null)
            await expect(loader.loadFromUrl('https://example.test/table.csv')).resolves.toBe(null)
        })

        it('passes a refused directory through', async () => {
            vi.spyOn(GenericStudyLoader.prototype, 'loadFromDirectory').mockResolvedValue(null)
            await expect(loader.loadFromDirectory({} as FileSystemItem)).resolves.toBe(null)
        })
    })
})
