// @vitest-environment jsdom
/**
 * Tests for the tabular data resource.
 *
 * The resource is driven with real tables and a real service, so a case about activation or about
 * what reaches the worker fails here rather than passing against a double built to agree with it.
 * @package    epicurrents/tab-module
 * @copyright  2026 Sampsa Lohi
 * @license    Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Log } from 'scoped-event-log'
import type { DataResource, StudyContext } from '@epicurrents/core/types'
import {
    columns,
    installRuntime,
    modules,
    removeRuntime,
    resourceDouble,
    row,
    section,
    settle,
    settled,
    workerDouble,
} from './double'

import TabularData from '#root/src/TabularData'
import TabDataTable from '#components/TabDataTable'

const study = () => ({ meta: {}, name: 'Test study' }) as StudyContext

let worker: ReturnType<typeof workerDouble>
let resource: TabularData

const table = (name: string) => new TabDataTable(name, columns, name, [section('main', [row(1, 'a', true)])])

const makeResource = async (source: StudyContext = study()) => {
    worker = workerDouble()
    const tabular = new TabularData('Test resource', source, worker.asWorker)
    await tabular.prepare()
    return tabular
}

describe('TabularData', () => {
    beforeEach(async () => {
        installRuntime()
        resource = await makeResource()
    })
    afterEach(() => {
        removeRuntime()
        vi.restoreAllMocks()
    })

    describe('construction', () => {
        it('takes its name, modality and source from the constructor', () => {
            expect(resource.name).toBe('Test resource')
            expect(resource.sourceFormat).toBe('tab')
            expect(resource.source).toBeTruthy()
            expect(resource.tables).toEqual([])
        })

        it('reads the preliminary table count from the study meta', async () => {
            const source = study()
            source.meta = { numTables: 3 }
            const preliminary = await makeResource(source)
            expect(preliminary.numTables).toBe(3)
        })
    })

    describe('content', () => {
        it('resolves with the tables rather than leaving the caller waiting', async () => {
            const first = table('one')
            resource.addTables(first)
            expect(await settled(resource.content)).toBe(true)
            await expect(resource.content).resolves.toEqual([first])
        })

        it('resolves with an empty list before any table has been added', async () => {
            await expect(resource.content).resolves.toEqual([])
        })
    })

    describe('tables', () => {
        it('replaces the previous tables when the property is set', () => {
            resource.tables = [table('one')]
            resource.tables = [table('two'), table('three')]
            expect(resource.tables.map(t => t.name)).toEqual(['two', 'three'])
        })

        it('ignores a value that is not an array', () => {
            resource.tables = [table('one')]
            resource.tables = null as unknown as TabDataTable[]
            expect(resource.tables).toHaveLength(1)
        })

        it('appends the tables it is given', () => {
            resource.tables = [table('one')]
            resource.addTables(table('two'), table('three'))
            expect(resource.tables.map(t => t.name)).toEqual(['one', 'two', 'three'])
        })

        it('counts only the tables that carry rows and are not metadata', () => {
            const empty = new TabDataTable('empty', columns, 'empty', [])
            const meta = new TabDataTable('meta', columns, 'meta', [section('main', [row(1, 'a', true)])], true)
            resource.tables = [table('one'), empty, meta]
            expect(resource.numTables).toBe(1)
        })

        it('removes tables by index, by id and by reference', () => {
            const [one, two, three] = [table('one'), table('two'), table('three')]
            resource.tables = [one, two, three]
            resource.removeTables(0)
            expect(resource.tables.map(t => t.name)).toEqual(['two', 'three'])
            resource.removeTables(two.id)
            expect(resource.tables.map(t => t.name)).toEqual(['three'])
            resource.removeTables(three)
            expect(resource.tables).toHaveLength(0)
        })

        it('ignores an empty designator among the tables to remove', () => {
            const one = table('one')
            resource.tables = [one]
            resource.removeTables(null as unknown as TabDataTable)
            expect(resource.tables).toHaveLength(1)
        })

        it('leaves the tables alone when asked to remove one it does not hold', () => {
            resource.tables = [table('one')]
            resource.removeTables(99, 'no-such-id')
            expect(resource.tables).toHaveLength(1)
        })
    })

    describe('active table', () => {
        it('activates the table set through the property', () => {
            const one = table('one')
            resource.tables = [one]
            resource.activeTable = one
            expect(one.isActive).toBe(true)
            expect(resource.activeTable).toBe(one)
        })

        it('deactivates the previously active table', () => {
            const [one, two] = [table('one'), table('two')]
            resource.tables = [one, two]
            resource.activeTable = one
            resource.activeTable = two
            expect(one.isActive).toBe(false)
            expect(two.isActive).toBe(true)
        })

        it('deactivates the active table when the property is cleared', () => {
            const one = table('one')
            resource.tables = [one]
            resource.activeTable = one
            resource.activeTable = null
            expect(one.isActive).toBe(false)
            expect(resource.activeTable).toBe(null)
        })

        it('activates a table by index or by name', () => {
            const [one, two] = [table('one'), table('two')]
            resource.tables = [one, two]
            resource.setActiveTableByReference(1)
            expect(two.isActive).toBe(true)
            resource.setActiveTableByReference('one')
            expect(one.isActive).toBe(true)
        })

        it('records the table itself when a table reports its own activation', () => {
            const one = table('one')
            resource.addTables(one)
            one.isActive = true
            expect(resource.activeTable).toBe(one)
        })

        it('reports a designator no table answers to', () => {
            resource.tables = [table('one')]
            resource.setActiveTableByReference('no-such-table')
            expect(resource.activeTable).toBe(null)
        })

        it('deactivates a table that was added by an earlier call', () => {
            const one = table('one')
            const two = table('two')
            resource.addTables(one)
            resource.addTables(two)
            one.isActive = true
            two.isActive = true
            expect(one.isActive).toBe(false)
            expect(resource.activeTable).toBe(two)
        })

        it('clears the active table when the active one reports its deactivation', () => {
            const one = table('one')
            resource.addTables(one)
            one.isActive = true
            one.isActive = false
            expect(resource.activeTable).toBe(null)
        })
    })

    describe('main properties', () => {
        it('keys each property by the message to translate', () => {
            resource.tables = [table('one'), table('two')]
            const props = resource.getMainProperties()
            expect([...props.keys()]).toContain('{n} tables')
            expect(props.get('{n} tables')).toMatchObject({ n: 2 })
        })

        it('keeps the table and study counts apart when they are equal', () => {
            resource.tables = [table('one'), table('two')]
            resource.addSubcontexts(['a', resourceDouble('a')], ['b', resourceDouble('b')])
            const props = resource.getMainProperties()
            expect(props.get('{n} tables')).toMatchObject({ n: 2 })
            expect(props.get('{n} studies')).toMatchObject({ n: 2 })
        })

        it('reports nothing of its own before the resource is ready', () => {
            const loading = new TabularData('Loading', study(), workerDouble().asWorker)
            expect([...loading.getMainProperties().keys()]).not.toContain('{n} tables')
        })

        it('reports the preliminary count before the tables have loaded', async () => {
            const source = study()
            source.meta = { numTables: 4 }
            const preliminary = await makeResource(source)
            expect(preliminary.getMainProperties().get('{n} tables')).toMatchObject({ n: 4 })
        })
    })

    describe('subcontexts', () => {
        it('adds a subcontext as a child resource', () => {
            const sub = resourceDouble('a')
            resource.addSubcontexts(['a', sub])
            expect(resource.subcontexts.get('a')).toBe(sub)
            expect(resource.childResources).toContain(sub)
        })

        it('skips a key it already holds', () => {
            resource.addSubcontexts(['a', resourceDouble('a')])
            resource.addSubcontexts(['a', resourceDouble('other')])
            expect(resource.subcontexts.size).toBe(1)
        })

        it('removes a subcontext by key and by resource', () => {
            const [a, b] = [resourceDouble('a'), resourceDouble('b')]
            resource.addSubcontexts(['a', a], ['b', b])
            resource.removeSubcontexts('a')
            expect([...resource.subcontexts.keys()]).toEqual(['b'])
            resource.removeSubcontexts(b)
            expect(resource.subcontexts.size).toBe(0)
        })

        it('keeps a child resource that is not one of its subcontexts', () => {
            const other = resourceDouble('other')
            resource.childResources = [other]
            resource.addSubcontexts(['a', resourceDouble('a')])
            resource.removeSubcontexts('a')
            expect(resource.childResources).toContain(other)
        })

        it('skips a resource that is already a child of the resource', () => {
            const child = resourceDouble('child')
            resource.childResources = [child]
            resource.addSubcontexts(['a', child])
            expect(resource.subcontexts.size).toBe(0)
        })

        it('answers null for a module that cannot build a resource from a template', async () => {
            modules.set('eeg', {})
            await expect(resource.loadSubcontextFromTemplate({ modality: 'eeg' })).resolves.toBe(null)
        })

        it('sets and clears the active subcontext', () => {
            const sub = resourceDouble('a')
            resource.addSubcontexts(['a', sub])
            resource.setActiveSubcontext('a')
            expect(resource.activeChildResource).toBe(sub)
            resource.setActiveSubcontext(null)
            expect(resource.activeChildResource).toBe(null)
        })

        it('refuses an unknown subcontext key', () => {
            resource.setActiveSubcontext('no-such-key')
            expect(resource.activeChildResource).toBe(null)
        })

        it('answers null for a template whose module is not registered', async () => {
            await expect(resource.loadSubcontextFromTemplate({ modality: 'eeg' })).resolves.toBe(null)
        })

        it('builds a subcontext from the module registered for its modality', async () => {
            const sub = resourceDouble('from-module')
            modules.set('eeg', { getResourceFromSerialized: () => sub })
            await expect(resource.loadSubcontextFromTemplate({ modality: 'eeg' })).resolves.toBe(sub)
        })

        it('answers null when the application runtime is not available', async () => {
            removeRuntime()
            await expect(resource.loadSubcontextFromTemplate({ modality: 'eeg' })).resolves.toBe(null)
        })
    })

    describe('loading study data', () => {
        it('builds a table for every template the worker returns', async () => {
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', {
                tables: [{ configuration: columns, isMetadata: false, label: 'First', name: 'first', sections: [] }],
            })
            await loading
            expect(resource.tables.map(t => t.name)).toEqual(['first'])
        })

        it('names a table after the resource when the template does not name one', async () => {
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', {
                tables: [{ configuration: columns, label: '', name: '', sections: [] }],
            })
            await loading
            expect(resource.tables[0].name).toBe('Test resource-table-1')
        })

        it('loads the subcontexts the worker reports', async () => {
            const sub = resourceDouble('child')
            modules.set('eeg', { getResourceFromSerialized: () => sub })
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', { studies: { eeg: [{ modality: 'eeg' }] }, tables: [] })
            await loading
            expect(resource.subcontexts.get('child')).toBe(sub)
        })

        it('loads on activation', async () => {
            resource.isActive = true
            await settle()
            expect(worker.worker.postedFor('setup-worker')).toHaveLength(1)
        })

        it('does not load again once the service is set up', async () => {
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', { studies: {}, tables: [] })
            await loading
            resource.isActive = true
            await settle()
            expect(worker.worker.postedFor('setup-worker')).toHaveLength(1)
        })

        it('monitors the tables it built, so activating one deactivates the rest', async () => {
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', {
                tables: [
                    { configuration: columns, label: 'First', name: 'first', sections: [] },
                    { configuration: columns, label: 'Second', name: 'second', sections: [] },
                ],
            })
            await loading
            const [first, second] = resource.tables
            first.isActive = true
            second.isActive = true
            expect(first.isActive).toBe(false)
            expect(resource.activeTable).toBe(second)
        })

        it('joins a load already in flight rather than starting a second', async () => {
            const first = resource.loadStudyData()
            const second = resource.loadStudyData()
            await settle()
            expect(worker.worker.postedFor('setup-worker')).toHaveLength(1)
            worker.worker.replyTo('setup-worker', {
                tables: [{ configuration: columns, label: 'First', name: 'first', sections: [] }],
            })
            await Promise.all([first, second])
            expect(resource.tables).toHaveLength(1)
        })

        it('goes to the error state when the worker refuses the setup', async () => {
            const loading = resource.loadStudyData()
            await settle()
            worker.worker.replyTo('setup-worker', { error: 'No source.', success: false })
            await loading
            expect(resource.state).toBe('error')
            expect(resource.errorReason).toContain('No source.')
        })

        it('goes to the error state instead of throwing when there is no worker to set up', async () => {
            const orphan = new TabularData('Orphan', study(), null as unknown as Worker)
            await orphan.prepare()
            await orphan.loadStudyData()
            expect(orphan.state).toBe('error')
        })
    })

    describe('annotations', () => {
        it('sends the labels of the resource to the worker', async () => {
            resource.labels = [{ name: 'label' }] as DataResource['labels']
            await settle()
            const posted = worker.worker.postedFor('save-annotations')
            expect(posted).toHaveLength(1)
            expect(posted[0].labels).toMatchObject([{ name: 'label' }])
        })

        it('reports a refused save to the caller that asked for it', async () => {
            const saving = resource.saveAnnotationsToDataset()
            await settle()
            worker.worker.replyTo('save-annotations', { error: 'Dataset is read-only.', success: false })
            await expect(saving).rejects.toBe('Dataset is read-only.')
        })

        it('handles a refused save from a label change, which has no caller to report to', async () => {
            const logged = vi.spyOn(Log, 'error')
            resource.labels = [{ name: 'label' }] as DataResource['labels']
            await settle()
            worker.worker.replyTo('save-annotations', { error: 'Dataset is read-only.', success: false })
            await settle()
            expect(logged).toHaveBeenCalled()
        })
    })
})
