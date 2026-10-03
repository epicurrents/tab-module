/**
 * Epicurrents tab data module.
 *
 * The module is registered on an application as a modality, after which a study loaded through
 * {@link TabDataLoader} becomes a {@link TabularData} resource holding one or more data tables.
 * @package    epicurrents/tab-module
 * @copyright  2025 Sampsa Lohi
 * @license    Apache-2.0
 */

import TabDataLoader from '#loader/TabDataLoader'
import TabularData from './TabularData'
import runtime from './runtime'
import settings from './config'

const modality = 'tab'

export {
    TabDataLoader,
    TabularData,
    modality,
    runtime,
    settings,
}
