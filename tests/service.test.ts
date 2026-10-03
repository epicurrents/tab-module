// @vitest-environment jsdom
/**
 * Tests for the service half of the module.
 *
 * This package ships no worker: the service is handed one by its consumer, so these cases are the
 * statement of the commission protocol a consumer's worker has to answer. The worker double replies
 * only when a case tells it to, which is what lets the cases about an answer that never comes — no
 * worker, or a refused setup — be written at all.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Log } from 'scoped-event-log'
import type { StudyContext } from '@epicurrents/core/types'
import { installRuntime, removeRuntime, settle, settled, workerDouble } from './double'

import TabDataService from '#service/TabDataService'

const study = (api?: { authHeader?: string, url: string }) => ({
    api,
    meta: {},
    name: 'Test study',
} as StudyContext)

let worker: ReturnType<typeof workerDouble>
let service: TabDataService

/** The commissions the service is still holding entries for, by action. */
const pending = (action: string) => {
    const commissions = (service as unknown as { _commissions: Map<string, Map<number, unknown>> })._commissions
    return commissions.get(action)?.size ?? 0
}

describe('TabDataService', () => {
    beforeEach(() => {
        installRuntime()
        worker = workerDouble()
        service = new TabDataService(worker.asWorker)
    })
    afterEach(() => {
        removeRuntime()
        vi.restoreAllMocks()
    })

    it('holds the worker it was given', () => {
        expect(service.worker).toBe(worker.asWorker)
    })

    describe('worker setup', () => {
        it('sends the source and the clonable settings snapshot', async () => {
            const setup = service.setupWorker(study({ authHeader: 'Bearer t', url: 'https://example.test/api' }))
            worker.worker.replyTo('setup-worker', { studies: {}, tables: [] })
            await setup
            const posted = worker.worker.postedFor('setup-worker')[0]
            expect(posted.sources).toBe('https://example.test/api')
            expect(posted.authHeader).toBe('Bearer t')
            expect(posted.settings).toEqual({ app: {}, modules: {} })
        })

        it('resolves with the tables and studies the worker reports', async () => {
            const setup = service.setupWorker(study())
            worker.worker.replyTo('setup-worker', { studies: { eeg: [] }, tables: [{ name: 'first' }] })
            await expect(setup).resolves.toMatchObject({
                studies: { eeg: [] },
                success: true,
                tables: [{ name: 'first' }],
            })
        })

        it('is ready once the setup has been answered', async () => {
            expect(service.isReady).toBe(false)
            const setup = service.setupWorker(study())
            worker.worker.replyTo('setup-worker', { studies: {}, tables: [] })
            await setup
            expect(service.isReady).toBe(true)
        })

        it('reports a refused setup instead of rejecting', async () => {
            const setup = service.setupWorker(study())
            worker.worker.replyTo('setup-worker', { error: 'No source.', success: false })
            await expect(setup).resolves.toMatchObject({ success: false })
        })

        it('reports a failure instead of answering null when there is no worker', async () => {
            const orphan = new TabDataService(null as unknown as Worker)
            await expect(orphan.setupWorker(study())).resolves.toMatchObject({ success: false })
        })

        it('settles the setup waiters when no reply can arrive', async () => {
            const orphan = new TabDataService(null as unknown as Worker)
            await orphan.setupWorker(study())
            expect(await settled(orphan.initialSetup as Promise<unknown>)).toBe(true)
        })

        it('reports a missing application runtime instead of throwing', async () => {
            removeRuntime()
            await expect(service.setupWorker(study())).resolves.toMatchObject({ success: false })
        })

        it('keeps no commission entry once the setup has been answered', async () => {
            const setup = service.setupWorker(study())
            worker.worker.replyTo('setup-worker', { studies: {}, tables: [] })
            await setup
            expect(pending('setup-worker')).toBe(0)
        })

        it('keeps no commission entry after a refused setup', async () => {
            const setup = service.setupWorker(study())
            worker.worker.replyTo('setup-worker', { error: 'No source.', success: false })
            await setup
            expect(pending('setup-worker')).toBe(0)
        })
    })

    describe('saving annotations', () => {
        const annotations = () => ({ events: [], id: 'dataset-1', labels: [] })

        it('sends the annotations to the worker', async () => {
            const saving = service.saveAnnotations(annotations())
            worker.worker.replyTo('save-annotations')
            await saving
            expect(worker.worker.postedFor('save-annotations')[0].id).toBe('dataset-1')
        })

        it('rejects with the reason the worker gave', async () => {
            const saving = service.saveAnnotations(annotations())
            worker.worker.replyTo('save-annotations', { error: 'Dataset is read-only.', success: false })
            await expect(saving).rejects.toBe('Dataset is read-only.')
        })

        it('rejects with a reason of its own when the worker gave none', async () => {
            const saving = service.saveAnnotations(annotations())
            worker.worker.replyTo('save-annotations', { success: false })
            await expect(saving).rejects.toBe('Failed to save annotations.')
        })

        it('rejects rather than resolving when there is no worker', async () => {
            const orphan = new TabDataService(null as unknown as Worker)
            await expect(orphan.saveAnnotations(annotations())).rejects.toBeTruthy()
        })

        it('keeps no commission entry once the save has been answered', async () => {
            const saving = service.saveAnnotations(annotations())
            worker.worker.replyTo('save-annotations')
            await saving
            expect(pending('save-annotations')).toBe(0)
        })
    })

    describe('reading rows', () => {
        it('sends the range it was asked for', async () => {
            const rows = service.getRows(10, 5)
            worker.worker.replyTo('get-rows', { result: [[{ value: 1 }]] })
            await rows
            const posted = worker.worker.postedFor('get-rows')[0]
            expect(posted.start).toBe(10)
            expect(posted.count).toBe(5)
        })

        it('resolves with the rows the worker returned', async () => {
            const rows = service.getRows(0)
            worker.worker.replyTo('get-rows', { result: [[{ value: 1 }]] })
            await expect(rows).resolves.toEqual([[{ value: 1 }]])
        })

        it('answers null when there is no worker', async () => {
            const orphan = new TabDataService(null as unknown as Worker)
            await expect(orphan.getRows(0)).resolves.toBe(null)
        })
    })

    describe('replies it did not ask for', () => {
        it('ignores a message carrying no data', async () => {
            await expect(service.handleMessage({ data: null } as unknown as MessageEvent)).resolves.toBe(false)
        })

        it('ignores a reply with no matching commission', async () => {
            worker.worker.reply({ action: 'setup-worker', rn: 999, success: true })
            await settle()
            expect(service.isReady).toBe(false)
        })

        it('reports a worker error through the commission', async () => {
            const spy = vi.spyOn(Log, 'error')
            const setup = service.setupWorker(study())
            worker.asWorker.onerror?.(new ErrorEvent('error', { message: 'Worker died.' }))
            await expect(setup).resolves.toMatchObject({ success: false })
            spy.mockRestore()
        })
    })
})
