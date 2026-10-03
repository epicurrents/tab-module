# @epicurrents/tab-module

Makes tabular data a resource modality in the Epicurrents viewer. A study loaded through this module becomes a resource holding one or more data tables — a column configuration, sections, and rows of typed cells — alongside the signal resources an application already shows, and can carry other resources as subcontexts of its rows.

## Public surface

| Export | What it is |
|---|---|
| `TabularData` | The resource. Holds the tables, the active one among them, and the subcontexts they point at. |
| `TabDataLoader` | The study loader. Stamps the `tab` modality onto a loaded study and builds the resource from it. |
| `runtime`, `settings`, `modality` | What an application registers to make the modality known. |
| `TabularDataResource`, `TabularDataTable`, `TabularDataService`, … (`./types`) | Types, including the worker protocol below. |

## Registering the module

```ts
import * as TabModule from '@epicurrents/tab-module'

app.registerModule(TabModule.modality, TabModule)
app.registerStudyLoader('tab', new TabModule.TabDataLoader('tab', importer))
```

The module declares no display properties of its own, so a property mutation addressed to it is reported as an invalid one. Its settings turn the memory manager off: the tables are plain data on the main thread, with no shared buffers to manage.

## The worker is the consumer's

This package ships no worker. The resource reads through one the application registers with its study importer, and the loader asks for it under the key `tab-tab` — the modality, prefixed — so a consumer registers it with `setWorkerOverride('tab-tab', …)`. A loader whose importer has no worker to give refuses to build the resource rather than returning one with nothing to read.

What that worker has to answer is the commission protocol:

| Commission | Reply |
|---|---|
| `setup-worker` | `tables`, the templates every table is built from, and optionally `studies`, the subcontext templates keyed by modality |
| `get-rows` | `result`, the rows of the range asked for |
| `save-annotations` | acknowledged, or `error` with the reason |

The setup commission carries the source url, its auth header and the clonable settings snapshot, and loading the data is part of it: the resource builds its tables as the setup resolves rather than from a later commission. A setup the worker refuses leaves the resource in the error state carrying the reason — the setup resolves a reply either way and never rejects, because the resource branches on `success` rather than catching. Saving annotations is the one commission that does reject, since it answers with nothing else to carry a reason.

## Tables

A table is a column configuration plus named sections of rows, and the configuration is what every mutation is checked against: a row that does not match it in length, or holds a cell of the wrong constructor type, is refused as a whole and leaves the table as it was. An empty cell is the null itself rather than a falsy value, so a zero or an empty string is a value a column accepts or refuses like any other.

Sections are addressed by name or by position, and a mutation writes back to the section it resolved. The names are expected to be unique within a table; two sections sharing one is not refused, but nothing resolves the second by name.

At most one table of a resource is active at a time, whether it is set through `activeTable`, named with `setActiveTableByReference`, or activated on the table itself.

## Subcontexts

A row, a section or a table may point at another resource through its `subcontext` id, and the resource keeps those resources in a map keyed by that id. They are also child resources of the tabular data resource, so an application showing one shows them beneath it. Which modules can build them is the application's business: a subcontext template is handed to the resource module registered for its modality, and a template naming a modality no module serves is skipped with a warning.

## Development

```bash
npm install
npm run build     # the library and its declarations
npm test          # type-checks the suite, then runs it
npm run lint
```

The suite drives the real resource, table, service and loader; only the worker is a double, since the package ships none. That double is the executable form of the protocol table above.

## License

Copyright 2019-2026 Sampsa Lohi

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
