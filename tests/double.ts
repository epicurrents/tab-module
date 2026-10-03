/**
 * Shared doubles for the tab module suite.
 *
 * Two things stand in for the environment: the application runtime, which every asset constructor
 * looks for on the window, and the worker, which this package does not ship — the service is handed
 * one by its consumer, so the suite is the only place that says what the commission protocol is.
 * Everything else under test is the real class.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { EventBus } from '@epicurrents/core'
import type {
    DataResource,
    DataTableColumnConfiguration,
    DataTableRowValue,
    DataTableSection,
} from '@epicurrents/core/types'

/** Give the microtask queue a turn, or wait `ms` for a timer-backed step. */
export const settle = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

/** Has the promise settled, or is its caller still waiting on it? */
export const settled = async (promise: Promise<unknown>) => {
    const pending = Symbol('pending')
    const outcome = await Promise.race([
        promise.then(value => value, error => error as unknown),
        settle(40).then(() => pending),
    ])
    return outcome !== pending
}

/**
 * A worker that records what it was sent and replies only when a test tells it to.
 *
 * The service answers its commissions from the `message` listener it registers in its constructor,
 * so a reply has to arrive as an event carrying the request number of the commission it answers;
 * {@link replyTo} looks that number up from what was posted, which is what keeps a test from
 * asserting against a reply the real service would have ignored.
 */
export class WorkerDouble {
    /** Every message the service posted, in order. */
    posted = [] as { [key: string]: unknown }[]
    /** Listeners the service registered for the `message` event. */
    protected _listeners = [] as ((event: MessageEvent) => unknown)[]
    terminated = false

    addEventListener (type: string, listener: (event: MessageEvent) => unknown) {
        if (type === 'message') {
            this._listeners.push(listener)
        }
    }

    /** Messages posted for `action`, in order. */
    postedFor (action: string) {
        return this.posted.filter(message => message.action === action)
    }

    postMessage (message: { [key: string]: unknown }) {
        this.posted.push(message)
    }

    /** Deliver `data` as a worker response, as it stands. */
    reply (data: { [key: string]: unknown }) {
        for (const listener of this._listeners) {
            listener({ data } as MessageEvent)
        }
    }

    /**
     * Answer the pending commission for `action` with `data`.
     * @param action - Commission to answer; its request number is read from what was posted.
     * @param data - Reply properties, merged over `{ action, rn, success: true }`.
     */
    replyTo (action: string, data: { [key: string]: unknown } = {}) {
        const posted = this.postedFor(action)
        const request = posted[posted.length - 1]
        this.reply({ action, rn: request?.rn, success: true, ...data })
    }

    removeEventListener (type: string, listener: (event: MessageEvent) => unknown) {
        if (type !== 'message') {
            return
        }
        const idx = this._listeners.indexOf(listener)
        if (idx !== -1) {
            this._listeners.splice(idx, 1)
        }
    }

    terminate () {
        this.terminated = true
    }
}

/** A worker double typed as the `Worker` the service constructor takes. */
export const workerDouble = () => {
    const worker = new WorkerDouble()
    return { worker, asWorker: worker as unknown as Worker }
}

/** Resource modules a test wants the runtime to resolve, keyed by modality. */
export const modules = new Map<string, unknown>()

/**
 * Install the application runtime on the window.
 *
 * The event bus is the real one: an asset that cannot find it falls back to a bus of its own and
 * logs the absence, which would make every property-change assertion in the suite pass for the
 * wrong reason.
 */
export const installRuntime = () => {
    modules.clear()
    const settings = {
        app: {},
        modules: {},
        _CLONABLE: { app: {}, modules: {} },
        addPropertyUpdateHandler: () => undefined,
        getFieldValue: () => undefined,
        removeAllPropertyUpdateHandlersFor: () => undefined,
    }
    ;(window as unknown as { __EPICURRENTS__: unknown }).__EPICURRENTS__ = {
        APP: {},
        EVENT_BUS: new EventBus(),
        RUNTIME: {
            MODULES: modules,
            SETTINGS: settings,
        },
    }
    return settings
}

/** Remove the runtime, for the cases about a package used outside an application. */
export const removeRuntime = () => {
    delete (window as unknown as { __EPICURRENTS__?: unknown }).__EPICURRENTS__
}

/** A three-column configuration covering the constructor types a cell may hold. */
export const columns = [
    { contentType: Number, label: 'ID', name: 'id' },
    { contentType: String, label: 'Name', name: 'name' },
    { contentType: Boolean, label: 'Active', name: 'active' },
] as DataTableColumnConfiguration[]

/** A row matching {@link columns}. */
export const row = (id: number, name: string, active: boolean) => [
    { value: id }, { value: name }, { value: active },
] as DataTableRowValue[]

/** A section matching {@link columns}, named for programmatic access. */
export const section = (name: string, rows: DataTableRowValue[][] = []): DataTableSection => ({
    name,
    rows,
    subcontext: null,
    title: name,
})

/** A resource double for the subcontext cases, which only ever read its id. */
export const resourceDouble = (id: string) => ({ id, name: id }) as unknown as DataResource
