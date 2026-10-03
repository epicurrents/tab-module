// @vitest-environment jsdom
/**
 * Tests for the runtime module.
 *
 * The module is what an application registers to make the modality known, so the properties the
 * application reads off it are its whole contract. It declares no property mutations of its own
 * yet, and these cases are what keeps that an answered call rather than a crash.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { describe, expect, it } from 'vitest'

import * as module from '#root/src/index'
import runtime from '#runtime'
import settings from '#config'

describe('runtime module', () => {
    it('names the modality it serves', () => {
        expect(runtime.moduleName.code).toBe('tab')
        expect(runtime.moduleName.full).toBeTruthy()
        expect(runtime.moduleName.short).toBeTruthy()
    })

    it('answers a configuration it has nothing to apply from', async () => {
        await expect(runtime.applyConfiguration({})).resolves.toBeUndefined()
    })

    it('takes the module name an application configures', async () => {
        await runtime.applyConfiguration({ moduleName: { full: 'Spreadsheets', short: 'Sheets' } })
        expect(runtime.moduleName.full).toBe('Spreadsheets')
        expect(runtime.moduleName.short).toBe('Sheets')
        await runtime.applyConfiguration({ moduleName: { full: 'Tabular Data', short: 'TabData' } })
    })

    it('answers a property mutation with no resource to apply it to', () => {
        expect(() => runtime.setPropertyValue('any-property', 1)).not.toThrow()
    })
})

describe('module exports', () => {
    it('exposes the modality, the loader, the resource, the runtime module and the settings', () => {
        expect(module.modality).toBe('tab')
        expect(module.TabDataLoader).toBeTruthy()
        expect(module.TabularData).toBeTruthy()
        expect(module.runtime).toBe(runtime)
        expect(module.settings).toBe(settings)
    })
})

describe('module settings', () => {
    it('leaves the memory manager out, since the module holds no shared buffers', () => {
        expect(settings.useMemoryManager).toBe(false)
    })
})
