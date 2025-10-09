/**
 * Epicurrents tab data module service.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { GenericService } from '@epicurrents/core'
import type { StudyContext, WorkerResponse } from '@epicurrents/core/dist/types'
import type { 
    TabularDataDataService,
    SetupTabDataWorkerResponse,
    GetRowsResponse,
} from '#types'
import { Log } from 'scoped-event-log'

const SCOPE = "TabDataService"

export default class TabDataService extends GenericService implements TabularDataDataService {

    get worker () {
        return this._worker
    }

    constructor (worker: Worker) {
        super ('tab-data', worker)
        this._worker?.addEventListener('message', this.handleMessage.bind(this))
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
        if (data.action === 'get-rows') {
            if (data.success) {
                commission.resolve(data.rows)
            } else {
                Log.error(`Fetching rows failed.`, SCOPE)
                commission.resolve(null)
            }
            return true
        } else if (data.action === 'set-sources') {
            if (data.success) {
                commission.resolve({ numRows: data.numRows })
            } else {
                Log.error(`Setting sources failed.`, SCOPE)
                commission.resolve({ numRows: 0 })
            }
            return true

        }
        return false
    }

    async prepareWorker (study: StudyContext) {
        // Find the data files.
        const items = study.files.filter(f => f.role === 'data').map(item => {
            return {
                file: item.file,
                url: item.url,
            }
        })
        const commission = this._commissionWorker(
            'set-sources',
            new Map([
                ['sources', items],
            ])
        )
        return commission.promise as Promise<SetupTabDataWorkerResponse>
    }
}