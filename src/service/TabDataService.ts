/**
 * Epicurrents tab data service.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericService } from '@epicurrents/core'
import type {
    AnnotationLabel,
    StudyContext,
    WorkerResponse,
} from '@epicurrents/core/types'
import type {
    GetRowsResponse,
    SetupTabDataWorkerResponse,
    TabularDataService,
} from '#types'
import { Log } from 'scoped-event-log'

const SCOPE = 'TabDataService'

export default class TabDataService extends GenericService implements TabularDataService {

    constructor (worker: Worker) {
        super('tab', worker)
        // The handler is asynchronous for the part it delegates to the base class, and a listener
        // returns nothing, so the promise is dropped deliberately rather than by omission.
        this._worker?.addEventListener('message', (message: MessageEvent) => {
            void this.handleMessage(message as WorkerResponse)
        })
    }

    get worker () {
        return this._worker
    }

    /**
     * The setup outcome in the shape the awaiting resource reads.
     *
     * The resource branches on `success` and has no rejection handler, so a setup that cannot be
     * carried out is reported rather than thrown: a rejection would reach it as an unhandled one and
     * leave the resource in its loading state with nothing logged. The table list is empty rather
     * than absent because the success branch iterates it without checking.
     * @param reason - What stopped the setup.
     */
    protected _setupFailed (reason: string): SetupTabDataWorkerResponse {
        Log.error(`Setting up the tab data worker failed: ${reason}`, SCOPE)
        return {
            message: reason,
            success: false,
            tables: [],
        }
    }

    async getRows (start: number, count?: number) {
        const commission = this._commissionWorker(
            'get-rows',
            new Map([
                ['start', start],
                ['count', count]
            ])
        )
        return commission.promise as Promise<GetRowsResponse>
    }

    async handleMessage (message: WorkerResponse) {
        const data = message.data
        if (!data) {
            return false
        }
        // Responses must have a matching commission.
        const commission = this._getCommissionForMessage(message)
        if (!commission) {
            return false
        }
        if (data.action === 'save-annotations') {
            // Both branches settle the commission, so the entry has served its purpose. Nothing else
            // drops it: the base class releases the commissions it settles, and these never reach it.
            this._releaseCommission(message)
            if (data.success) {
                commission.resolve()
            } else if (commission.reject) {
                commission.reject((data.error as string) || 'Failed to save annotations.')
            }
            return true
        } else if (data.action === 'setup-worker') {
            this._releaseCommission(message)
            const prevState = this.isReady
            this._isCacheSetup = data.success
            this._isWorkerSetup = data.success
            if (data.success) {
                Log.debug(`Worker setup complete.`, SCOPE)
                commission.resolve({
                    studies: data.studies,
                    success: data.success,
                    tables: data.tables,
                })
                this.dispatchPropertyChangeEvent('isReady', this.isReady, prevState)
            } else {
                commission.resolve(this._setupFailed((data.error as string) || 'The worker refused the setup.'))
            }
            this._notifyWaiters('setup-worker', data.success)
            return true
        }
        return super._handleWorkerCommission(message)
    }

    async saveAnnotations (annotations: { events: unknown[], id: string, labels: AnnotationLabel[] }) {
        if (!this._worker) {
            // Unlike the setup, this one is awaited by a method that promises nothing but completion,
            // so a rejection is the only way it has to report a failure. The base class would answer
            // a resolved null here, which reads as a successful save. A worker-reported refusal
            // arrives as the reason string the commission callbacks carry, so a caller that reports
            // the reason has to accept either shape.
            return Promise.reject(new Error('The tab data worker is not available.'))
        }
        const commission = this._commissionWorker(
            'save-annotations',
            new Map<string, unknown>([
                ['events', annotations.events],
                ['id', annotations.id],
                ['labels', annotations.labels],
            ])
        )
        return commission.promise as Promise<void>
    }

    async setupWorker (study: StudyContext) {
        // The waiters are what `initialSetup` resolves from, and the reply is what notifies them, so
        // every path below that cannot produce a reply notifies them itself. Left waiting, they hold
        // every later call that awaits the setup for the rest of the session.
        this._initWaiters('setup-worker')
        // The clonable snapshot, not the live settings object: that one is a Proxy carrying its own
        // methods, which `postMessage` cannot structurally clone. The recovery path cannot rescue it
        // either, since it passes functions through by reference, so the retry throws again and the
        // rejection escapes uncaught.
        const settings = window.__EPICURRENTS__?.RUNTIME?.SETTINGS?._CLONABLE
        if (!settings) {
            this._notifyWaiters('setup-worker', false)
            return this._setupFailed('Reference to core application runtime was not found.')
        }
        const commission = this._commissionWorker(
            'setup-worker',
            new Map<string, unknown>([
                ['settings', settings],
                ['sources', study.api?.url],
                ['authHeader', study.api?.authHeader],
            ])
        )
        try {
            const response = await commission.promise as SetupTabDataWorkerResponse | null
            if (!response) {
                // The base class answers a resolved null when it has no worker to post to, which is
                // the state after a shutdown; nothing will reply, so nothing will notify the waiters.
                this._notifyWaiters('setup-worker', false)
                return this._setupFailed('The tab data worker is not available.')
            }
            return response
        } catch (e: unknown) {
            // A worker-level error rejects every commission in flight at once, this one included.
            this._notifyWaiters('setup-worker', false)
            return this._setupFailed(e instanceof Error ? e.message : String(e))
        }
    }
}
