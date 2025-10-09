/**
 * Epicurrents tab data module module.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

//import { logInvalidMutation } from '@epicurrents/core/dist/runtime'
import type {
    DataResource,
    RuntimeResourceModule,
    SafeObject,
    StateManager,
} from '@epicurrents/core/dist/types'
import type { TabularDataResource } from '#types'

//const SCOPE = 'tab-runtime-module'

const TAB: SafeObject & RuntimeResourceModule = {
    __proto__: null,
    moduleName: {
        code: 'tab',
        full: 'Tabular Data',
        short: 'TabData',
    },
    async applyConfiguration (_config) {

    },
    setPropertyValue (_property: string, _value: unknown, resource?: DataResource, state?: StateManager) {
        // TabData specific property mutations.
        const activeRes = resource
                          ? resource as TabularDataResource
                          : state
                            ? state.APP.activeDataset?.activeResources[0] as TabularDataResource
                            : null
        if (!activeRes) {
            return
        }
    },
}
export default TAB
