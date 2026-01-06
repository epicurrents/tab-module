/**
 * Epicurrents tab data module service.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericService } from '@epicurrents/core'
import type {
    AnnotationLabel,
    StudyContext,
    WorkerResponse,
} from '@epicurrents/core/dist/types'
import type {
    TabularDataService,
    SetupTabDataWorkerResponse,
    GetRowsResponse,
} from '#types'
import { Log } from 'scoped-event-log'

const SCOPE = "TabDataService"

export default class TabDataService extends GenericService implements TabularDataService {

    constructor (worker: Worker) {
        super ('tab', worker)
        this._worker?.addEventListener('message', this.handleMessage.bind(this))
    }

    get worker () {
        return this._worker
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
            if (data.success) {
                commission.resolve()
            } else if (commission.reject) {
                commission.reject((data.error as string) || 'Failed to save annotations.')
            }
            return true
        } else if (data.action === 'setup-worker') {
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
            } else if (commission.reject) {
                commission.reject(data.error as string)
            }
            this._notifyWaiters('setup-worker', data.success)
            return true
        }
        return super._handleWorkerCommission(message)
    }

    async saveAnnotations (annotations: { events: unknown[], id: string, labels: AnnotationLabel[]}) {
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
        this._initWaiters('setup-worker')
        const commission = this._commissionWorker(
            'setup-worker',
            new Map<string, unknown>([
                ['settings', window.__EPICURRENTS__.RUNTIME?.SETTINGS],
                ['sources', study.api?.url],
                ['authHeader', study.api?.authHeader],
            ])
        )
        return commission.promise as Promise<SetupTabDataWorkerResponse>
    }
}
