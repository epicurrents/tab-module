/**
 * Epicurrents tab data runtime module.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import { logInvalidMutation } from '@epicurrents/core/runtime'
import { safeObjectFrom } from '@epicurrents/core/util'
import type {
    RuntimeResourceModule,
    RuntimeResourceModuleConfig,
    SafeObject,
} from '@epicurrents/core/types'

const SCOPE = 'tab-runtime-module'

// `safeObjectFrom` is typed to return `any`, so the assertion belongs on its result: asserting the
// template instead leaves the module object itself untyped, and every property read off it unchecked.
const TAB = safeObjectFrom({
    moduleName: {
        code: 'tab',
        full: 'Tabular Data',
        short: 'TabData',
    },
    applyConfiguration (config: RuntimeResourceModuleConfig) {
        // Module name.
        if (config.moduleName?.full) {
            TAB.moduleName.full = config.moduleName.full
        }
        if (config.moduleName?.short) {
            TAB.moduleName.short = config.moduleName.short
        }
        // Nothing here is asynchronous, but the module interface declares the method as such.
        return Promise.resolve()
    },
    setPropertyValue (property: string, value: unknown) {
        // This modality declares no display properties of its own, and the application routes a
        // mutation to the module of the modality it names, so anything arriving here names a
        // property this module does not have.
        logInvalidMutation(property, value, SCOPE)
    },
}) as SafeObject & RuntimeResourceModule
export default TAB
