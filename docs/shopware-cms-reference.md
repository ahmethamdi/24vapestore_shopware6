# Shopware 6.7 — Custom CMS Elements & Blocks in a Theme/Plugin

**Verification basis:** All code marked ✅ VERIFIED was read from Shopware core source at tag **`v6.7.12.1`** (latest 6.7 patch at time of research) via `raw.githubusercontent.com/shopware/shopware/v6.7.12.1/...`. Prose docs were read from `developer.shopware.com`. Where the official docs contradict core source, **the source wins** and this is flagged explicitly.

> ⚠️ **The single most important finding:** the official "Add CMS Element" guide on developer.shopware.com is **partially stale for 6.7**. It shows `initElementConfig('name')` with an argument, `Shopware.Component.register` with inline `template:` strings, and `element.config.x.value` in Twig. Core 6.7 uses `initElementConfig()` **with no argument**, async component factories, and `element.fieldConfig.elements` / `element.translated.config` in Twig. Details in §9.

---

## 1. Custom CMS Element

### 1.1 Directory structure ✅ VERIFIED (mirrors core `sw-cms/elements/product-slider/`)

```
<plugin root>/src/
├── Resources/
│   ├── app/administration/src/
│   │   ├── main.js                                  # entry, imports the element
│   │   └── module/sw-cms/elements/<name>/
│   │       ├── index.js                             # register + registerCmsElement
│   │       ├── component/                           # renders inside the CMS editor
│   │       │   ├── index.js
│   │       │   ├── sw-cms-el-<name>.html.twig
│   │       │   └── sw-cms-el-<name>.scss
│   │       ├── config/                              # right-hand config panel
│   │       │   ├── index.js
│   │       │   ├── sw-cms-el-config-<name>.html.twig
│   │       │   └── sw-cms-el-config-<name>.scss
│   │       └── preview/                             # thumbnail in the element picker
│   │           ├── index.js
│   │           ├── sw-cms-el-preview-<name>.html.twig
│   │           └── sw-cms-el-preview-<name>.scss
│   ├── views/storefront/element/
│   │   └── cms-element-<name>.html.twig             # storefront output
│   ├── config/services.xml                          # only if you need a PHP resolver
│   └── snippet/…                                    # admin + storefront snippets
└── DataResolver/<Name>CmsElementResolver.php        # only if you need a PHP resolver
```

**Naming convention** ✅ VERIFIED: core uses `sw-cms-el-<name>`, `sw-cms-el-config-<name>`, `sw-cms-el-preview-<name>`. The prefix is *not* enforced by the framework — `component`/`configComponent`/`previewComponent` in the registration are free-form strings. But **prefix your own with a vendor token** (e.g. `vape-cms-el-hero`) to avoid collisions with core, which owns the whole `sw-cms-el-*` namespace.

The **storefront** filename `cms-element-<name>.html.twig` **IS enforced** — see §1.5.

### 1.2 `index.js` — registration ✅ VERIFIED

Core 6.7 pattern (from `elements/product-slider/index.ts`), converted to plain JS:

```javascript
// src/Resources/app/administration/src/module/sw-cms/elements/vape-hero/index.js

Shopware.Component.register('vape-cms-el-preview-hero', () => import('./preview'));
Shopware.Component.register('vape-cms-el-config-hero', () => import('./config'));
Shopware.Component.register('vape-cms-el-hero', () => import('./component'));

Shopware.Service('cmsService').registerCmsElement({
    name: 'vape-hero',
    label: 'vape-cms.elements.hero.label',
    component: 'vape-cms-el-hero',
    configComponent: 'vape-cms-el-config-hero',
    previewComponent: 'vape-cms-el-preview-hero',
    defaultConfig: {
        headline:  { source: 'static', value: 'Your headline' },
        media:     { source: 'static', value: null, required: true, entity: { name: 'media' } },
        ctaUrl:    { source: 'static', value: null },
        newTab:    { source: 'static', value: false },
        minHeight: { source: 'static', value: '480px' },
    },
});
```

**⚠️ 6.7 change vs 6.5:** components are registered with an **async factory** `() => import('./component')`, not an inline object. Per `RELEASE_INFO-6.7.md`: *"We are making all administration components async by default… This can lead to some issues when accessing components directly in the template with a `ref`."* The old synchronous `Shopware.Component.register('x', { template, ... })` still works, but async is the core pattern and keeps bundle size sane.

`main.js` just does:
```javascript
import './module/sw-cms/elements/vape-hero';
```

### 1.3 `registerCmsElement` — exact signature ✅ VERIFIED

From `src/Administration/Resources/app/administration/src/module/sw-cms/service/cms.service.ts` (`type CmsElementConfig`) — this is the **authoritative** contract:

```typescript
type CmsElementConfig = {
    name: string;                      // required — technical type, matches DB cms_slot.type
    component: string;                 // required — editor component name
    configComponent?: string;
    previewComponent?: string;
    label?: string;                    // snippet key
    flag?: boolean;                    // if === false, registration is SKIPPED entirely
    collect?: (slot) => Record<string, CmsSlotData>;
    enrich?: (slot, collectionMap) => void;
    allowedPageTypes?: string[];       // e.g. ['product_list','landingpage','product_detail']
    defaultConfig?: unknown;
    disabledConfigInfoTextKey?: string;
    defaultData?: unknown;
    hidden?: boolean;                  // hide from the element picker
    removable?: boolean;
    appData?: { baseUrl: string };
    hover?: boolean;
};
```

And the method body ✅ VERIFIED:
```typescript
public registerCmsElement(config: CmsElementConfig): boolean {
    if (!config.name || !config.component || config.flag === false) return false;
    if (!config.collect) config.collect = CmsElementCollect;
    if (!config.enrich) config.enrich = CmsElementEnrich;
    Shopware.Application.view?.setReactive(this.elementRegistry, config.name, config);
    return true;
}
```

**Has it changed from 6.5?** The *shape* is largely unchanged (still `name`/`label`/`component`/`configComponent`/`previewComponent`/`defaultConfig`). What is new/notable in 6.7:
- `allowedPageTypes`, `hidden`, `removable`, `disabledConfigInfoTextKey`, `hover`, `appData` are all first-class in the type.
- `getCollectFunction()` — see §1.4.
- The registry is now a Vue 3 `reactive()` object written through `Application.view.setReactive` (Vue 2 reactivity layer is gone).

### 1.4 Loading entities: two mechanisms

There are **two independent data layers** — do not confuse them.

#### (a) Admin-side auto-collect via `entity` in `defaultConfig` ✅ VERIFIED

If a config field declares `entity`, the default `collect`/`enrich` functions automatically build a Criteria, fetch the entities, and place them on `element.data[configKey]` **inside the CMS editor**. From `cms.service.ts`:

```javascript
media: {
    source: 'static',
    value: null,
    required: true,
    entity: { name: 'media' },          // → element.data.media
},
products: {
    source: 'static',
    value: [],
    required: true,
    entity: {
        name: 'product',
        criteria: new Shopware.Data.Criteria(1, 25).addAssociation('cover'),
    },                                   // → element.data.products (array)
},
```

For **inheritance-aware** collection (product detail page overrides), core's product-slider passes:
```javascript
collect: Shopware.Service('cmsService').getCollectFunction(),
```
✅ VERIFIED — `getCollectFunction()` returns `CmsElementCollectWithInheritance`, which sets `context.inheritance = true`. Use it for any element whose entities can be inherited from a parent product/category.

#### (b) Storefront-side PHP resolver — **when do you need one?**

You need a PHP `AbstractCmsElementResolver` when:
1. Your element must load entities from the DB for the **storefront** (the admin `entity` config does *not* populate storefront data), **or**
2. You need `source: 'mapped'` support (bind config to a property of the current page entity, e.g. `product.name`), **or**
3. You call an external API / compute derived data at render time.

You do **NOT** need one for a purely static element (text, headline, a URL, a colour). Core's `text` element has no resolver.

> ⚠️ **Media is a special case:** core ships `MediaCmsElementResolver`-style handling; a plain `media` config field on a custom element still needs your own resolver to expose `element.data.media` in the storefront. Do not assume it is free.

**Resolver skeleton** ✅ VERIFIED against `AbstractCmsElementResolver` in `src/Core/Content/Cms/DataResolver/Element/`:

```php
<?php declare(strict_types=1);

namespace Vape\Theme\DataResolver;

use Shopware\Core\Content\Cms\Aggregate\CmsSlot\CmsSlotEntity;
use Shopware\Core\Content\Cms\DataResolver\CriteriaCollection;
use Shopware\Core\Content\Cms\DataResolver\Element\AbstractCmsElementResolver;
use Shopware\Core\Content\Cms\DataResolver\Element\ElementDataCollection;
use Shopware\Core\Content\Cms\DataResolver\FieldConfig;
use Shopware\Core\Content\Cms\DataResolver\ResolverContext\ResolverContext;
use Shopware\Core\Content\Media\MediaDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

class VapeHeroCmsElementResolver extends AbstractCmsElementResolver
{
    public function getType(): string
    {
        return 'vape-hero';                       // MUST equal registerCmsElement.name
    }

    public function collect(CmsSlotEntity $slot, ResolverContext $resolverContext): ?CriteriaCollection
    {
        $config = $slot->getFieldConfig();
        $mediaConfig = $config->get('media');

        if (!$mediaConfig
            || $mediaConfig->isMapped()
            || $mediaConfig->getValue() === null) {
            return null;
        }

        $criteria = new Criteria([$mediaConfig->getStringValue()]);

        $collection = new CriteriaCollection();
        $collection->add('media_' . $slot->getUniqueIdentifier(), MediaDefinition::class, $criteria);

        return $collection;
    }

    public function enrich(
        CmsSlotEntity $slot,
        ResolverContext $resolverContext,
        ElementDataCollection $result
    ): void {
        $config = $slot->getFieldConfig();
        $data = new \Shopware\Core\Content\Cms\SalesChannel\Struct\ImageStruct();
        $slot->setData($data);

        $mediaConfig = $config->get('media');
        if (!$mediaConfig || $mediaConfig->getValue() === null) {
            return;
        }

        if ($mediaConfig->getSource() === FieldConfig::SOURCE_MAPPED) {
            return;
        }

        $searchResult = $result->get('media_' . $slot->getUniqueIdentifier());
        if (!$searchResult) {
            return;
        }

        $media = $searchResult->get($mediaConfig->getStringValue());
        if ($media) {
            $data->setMedia($media);
        }
    }
}
```

Register with the `shopware.cms.data_resolver` tag:

```xml
<!-- src/Resources/config/services.xml -->
<service id="Vape\Theme\DataResolver\VapeHeroCmsElementResolver">
    <tag name="shopware.cms.data_resolver"/>
</service>
```

**`FieldConfig` API** ✅ VERIFIED (`src/Core/Content/Cms/DataResolver/FieldConfig.php`):
```php
FieldConfig::SOURCE_STATIC          // 'static'
FieldConfig::SOURCE_MAPPED          // 'mapped'
FieldConfig::SOURCE_DEFAULT         // 'default'
FieldConfig::SOURCE_PRODUCT_STREAM  // 'product_stream'

$c->getName(); $c->getSource(); $c->getValue();
$c->getStringValue(); $c->getIntValue(); $c->getFloatValue();
$c->getBoolValue(); $c->getArrayValue();   // throws CmsException on type mismatch
$c->isStatic(); $c->isMapped(); $c->isProductStream(); $c->isDefault();
```

**Lifecycle:** `collect()` (declare Criteria) → framework batch-executes all queries → `enrich()` (attach to slot via `$slot->setData()`) → Twig reads `element.data`.

**6.7 extension points** (verified in docs, useful for overriding *core* elements without replacing the resolver):
`CmsSlotsDataCollectExtension`, `CmsSlotsDataEnrichExtension`, `CmsSlotsDataResolveExtension` — events `cms-slots-data.{collect,enrich,resolve}.{pre,post}`. Use `.pre` hooks; "page loaded" events are too late because the storefront reads from CMS structs, not the original entity.

### 1.5 Storefront template ✅ VERIFIED

Path: `src/Resources/views/storefront/element/cms-element-<name>.html.twig`

The filename is resolved dynamically by the block template — this is why the name must match exactly. From core `block/cms-block-image-text.html.twig`:
```twig
{% sw_include '@Storefront/storefront/element/cms-element-' ~ element.type ~ '.html.twig' ignore missing %}
```

> ⚠️ `ignore missing` means a typo'd filename fails **silently** — the element renders as an empty div with no error. This is the #1 "my element doesn't show up" cause.

**How to read config in Twig** ✅ VERIFIED from core `cms-element-image.html.twig`. Core uses **two** accessors and they are not interchangeable:

```twig
{% block element_vape_hero %}
    {# shorthand alias — non-translated field config #}
    {% set config = element.fieldConfig.elements %}

    <div class="cms-element-{{ element.type }}">
        {# translated values: ALWAYS prefer element.translated.config for merchant-entered text #}
        <h2>{{ element.translated.config.headline.value }}</h2>

        {# entity data attached by the PHP resolver #}
        {% if element.data.media.url %}
            {% sw_thumbnails 'vape-hero-thumbnails' with { media: element.data.media } %}
        {% endif %}

        {% if element.translated.config.ctaUrl.value %}
            <a href="{{ element.translated.config.ctaUrl.value }}"
               {% if element.translated.config.newTab.value %}target="_blank" rel="noopener"{% endif %}>
                Shop now
            </a>
        {% endif %}
    </div>
{% endblock %}
```

| Accessor | Meaning |
|---|---|
| `element.config.x.value` | works, but **not** translation-aware. What the stale docs show. |
| `element.translated.config.x.value` | ✅ what core actually uses for merchant text/URLs — respects language layer |
| `element.fieldConfig.elements.x.value` | `FieldConfigCollection` view; core aliases it to `config` for layout/styling flags |
| `element.data.<key>` | entities attached by the **PHP resolver** |
| `element.type`, `element.id` | slot type / slot UUID |

**Rule of thumb for this project:** use `element.translated.config.*` for anything a merchant types (headline, alt text, URL); `element.fieldConfig.elements.*` is fine for layout enums (displayMode, verticalAlign).

---

## 2. Custom CMS Block

### 2.1 Directory structure ✅ VERIFIED (mirrors `sw-cms/blocks/text-image/image-text/`)

```
src/Resources/app/administration/src/module/sw-cms/blocks/<category>/<name>/
├── index.js
├── component/
│   ├── index.js
│   ├── sw-cms-block-<name>.html.twig
│   └── sw-cms-block-<name>.scss
└── preview/
    ├── index.js
    ├── sw-cms-preview-<name>.html.twig
    └── sw-cms-preview-<name>.scss
```
Note core's preview component is named `sw-cms-preview-<name>` (no `block`), while the layout one is `sw-cms-block-<name>`. ✅ VERIFIED.

Storefront: `src/Resources/views/storefront/block/cms-block-<name>.html.twig`.

### 2.2 `registerCmsBlock` — exact signature ✅ VERIFIED (`cms.service.ts`)

```typescript
type CmsBlockConfig = {
    name: string;                 // required
    component: string;            // required
    configComponent?: string;
    previewComponent?: string;
    previewImage?: string;
    appName?: string;
    category?: string;
    label?: string;
    flag?: boolean;               // === false → skipped
    hidden?: boolean;
    removable?: boolean;
    allowedPageTypes?: string[];
    defaultConfig: unknown;       // NOTE: not optional in the type
    slots?: Record<string, string | {
        type: string;
        default?: {
            config?: CmsSlotConfig;
            data?: { [key: string]: { source: string; value: unknown } };
        };
    }>;
};
```

### 2.3 Real block registration ✅ VERIFIED (core `blocks/text-image/image-text/index.ts`)

```javascript
Shopware.Component.register('sw-cms-preview-image-text', () => import('./preview'));
Shopware.Component.register('sw-cms-block-image-text', () => import('./component'));

Shopware.Service('cmsService').registerCmsBlock({
    name: 'image-text',
    label: 'sw-cms.blocks.textImage.imageText.label',
    category: 'text-image',
    component: 'sw-cms-block-image-text',
    previewComponent: 'sw-cms-preview-image-text',
    defaultConfig: {
        marginBottom: '20px',
        marginTop: '20px',
        marginLeft: null,
        marginRight: null,
        sizingMode: 'boxed',        // 'boxed' | 'full_width'
    },
    slots: {
        left: {
            type: 'image',
            default: {
                config: { displayMode: { source: 'static', value: 'standard' } },
                data: {
                    media: {
                        value: Shopware.Constants.CMS.MEDIA.previewMountain,
                        source: 'default',
                    },
                },
            },
        },
        right: 'text',              // shorthand: slot name → element type
    },
});
```

### 2.4 Block categories ✅ VERIFIED

Actual directories under `sw-cms/blocks/` in v6.7.12.1:

```
app, commerce, form, html, image, sidebar, text, text-image, video
```

The user's guess of "text, image, video, commerce, form, sidebar" is correct but **incomplete** — `text-image`, `html`, and `app` also exist. `app` is reserved for Admin-SDK/app blocks. `category` is a free string; an unknown value creates a new (untranslated) tab in the block picker, so stick to the nine above.

### 2.5 ⚠️ 6.7 BREAKING CHANGE — block `component` is now honoured

From `UPGRADE-6.7.md`:

> **CMS block component name will be used** — When rendering CMS block components in the Administration, the `component` property of the block config will be used instead of `sw-cms-block-${block.type}`. If there is no component name defined, `sw-cms-block-${block.type}` will be used as a fallback. Make sure you have set the correct component name in your CMS block configs.

In ≤6.6 the `component` field was effectively ignored for blocks (the name was derived from the type). If you port a 6.5 block whose `component` string doesn't match its registered component name, **it will now render the wrong component or nothing.** Always set `component` explicitly and correctly.

### 2.6 Block component + preview ✅ VERIFIED

`component/index.js` — genuinely this small:
```javascript
import template from './sw-cms-block-image-text.html.twig';
import './sw-cms-block-image-text.scss';

export default { template };
```

`component/sw-cms-block-image-text.html.twig` — slots are plain Vue named slots:
```twig
{% block sw_cms_block_image_text %}
<div class="sw-cms-block-image-text">
    <slot name="left">
        {% block sw_cms_block_image_text_slot_left %}{% endblock %}
    </slot>
    <slot name="right">
        {% block sw_cms_block_image_text_slot_right %}{% endblock %}
    </slot>
</div>
{% endblock %}
```
> The `<slot name="...">` values **must** match the keys in `slots: {}` or the editor renders empty drop zones.

`preview/index.js`:
```javascript
import template from './sw-cms-preview-image-text.html.twig';
import './sw-cms-preview-image-text.scss';

export default {
    template,
    computed: {
        assetFilter() {
            return Shopware.Filter.getByName('asset');
        },
    },
};
```

### 2.7 Storefront block template ✅ VERIFIED (core `cms-block-image-text.html.twig`)

```twig
{% block block_image_text %}
    {% set columns = 2 %}

    {% block block_image_text_left %}
        {% set element = block.slots.getSlot('left') %}

        <div class="col-md-6" data-cms-element-id="{{ element.id }}">
            {% block block_image_text_left_inner %}
                {% sw_include '@Storefront/storefront/element/cms-element-' ~ element.type ~ '.html.twig' ignore missing %}
            {% endblock %}
        </div>
    {% endblock %}

    {% block block_image_text_right %}
        {% set element = block.slots.getSlot('right') %}

        <div class="col-md-6" data-cms-element-id="{{ element.id }}">
            {% block block_image_text_right_inner %}
                {% sw_include '@Storefront/storefront/element/cms-element-' ~ element.type ~ '.html.twig' ignore missing %}
            {% endblock %}
        </div>
    {% endblock %}
{% endblock %}
```

Key points:
- `{% set element = block.slots.getSlot('<slotName>') %}` — pulls the slot.
- `sw_include` with `~ element.type ~` — the merchant may have **swapped the element type** in that slot, so never hardcode the element template.
- `data-cms-element-id="{{ element.id }}"` — **required** for the admin live-preview click-to-select overlay to work. Omitting it makes the block un-selectable in preview.
- The block template renders **inside** a Bootstrap `.row` provided by the section wrapper; emit `col-*` divs, not your own `.row`.
- Iterate all slots with `{% for slotName, slot in block.slots %}` when the slot set is dynamic.

---

## 3. Config field types

### 3.1 Important framing

`defaultConfig` does **not** declare a "field type". It only declares `{ source, value, required?, entity? }`. The **widget** is whatever Vue component you place in your `config/*.html.twig`. So the "catalog of config field types" is really the catalog of admin components you can use in the config panel.

`source` ✅ VERIFIED valid values (`FieldConfig` PHP consts + `CmsSlotConfig` TS type):
`'static'` | `'mapped'` | `'default'` | `'product_stream'`

### 3.2 Widget catalog for 6.7 config panels

Meteor components (`mt-*`) replaced ~20 `sw-*` components in 6.7. Verified in use in core `sw-cms-el-config-product-slider.html.twig`:

| Need | 6.7 component | Binding | Status |
|---|---|---|---|
| Text | `mt-text-field` | `v-model` | ✅ verified in core |
| Number | `mt-number-field` | `v-model` + `number-type="int"`, `:min`, `:max` | ✅ verified |
| Boolean / switch | `mt-switch` | `v-model` | ✅ verified |
| Checkbox | `mt-checkbox` | `v-model` | Meteor (inferred) |
| Select (static options) | `mt-select` | `v-model` + `:options="[{value,label}]"` | ✅ verified |
| Textarea | `mt-textarea` | `v-model` | Meteor (inferred) |
| Colour | `mt-colorpicker` | `v-model` | Meteor (inferred) |
| Banner / hint | `mt-banner` | `variant="info\|attention"` | ✅ verified |
| Icon | `mt-icon` | `name`, `size` | ✅ verified |
| Select w/ clear (legacy) | `sw-single-select` | `v-model:value` + `@update:value` | ✅ verified |
| Multi select (legacy) | `sw-multi-select` | `v-model:value` | still `sw-*` |
| **Entity single** (category, cms_page, product_stream…) | `sw-entity-single-select` | `v-model:value` + `entity="…"` + `:criteria` | ✅ verified |
| **Entity multi** (products…) | `sw-entity-multi-select` | `v-model:entity-collection` + `@update:entity-collection` | ✅ verified |
| **Media** | `sw-media-upload-v2` + `sw-media-modal-v2` | custom handlers | still `sw-*` |
| **Rich text** | `sw-text-editor` | `v-model:value` | still `sw-*` |
| URL / link | `sw-cms-el-config-…` custom, or `mt-text-field`, or `sw-dynamic-url-field` | — | ⚠️ `sw-dynamic-url-field` NOT verified at 6.7.12.1 |
| Inheritance wrapper | `sw-cms-inherit-wrapper` | `field`, `:element`, `:label` | ✅ verified |
| Tabs | `sw-tabs` / `sw-tabs-item` | `position-identifier` **required** | ✅ verified |
| Layout container | `sw-container` | `columns="1fr 1fr"`, `gap` | ✅ verified |

**⚠️ Binding rule — this bites hard:**
- **`mt-*` (Meteor)** use standard Vue 3 `v-model` (→ `modelValue` / `@update:modelValue`).
- **`sw-*` legacy selects** use `v-model:value` (→ `value` prop / `@update:value`).

Getting this backwards yields a field that renders but silently never saves. Both appear side by side in core's own product-slider config — this is not a migration artefact, it is the current state.

**Also:** `sw-tabs` requires `position-identifier`. Omitting it throws a console error in 6.7.

### 3.3 Worked example — config panel with several field types

Modelled directly on core's product-slider config (verified structure), for a hypothetical `vape-hero`:

`config/index.js`:
```javascript
import template from './vape-cms-el-config-hero.html.twig';
import './vape-cms-el-config-hero.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

export default {
    template,

    inject: ['repositoryFactory'],

    mixins: [Mixin.getByName('cms-element')],

    data() {
        return { mediaModalIsOpen: false, initialFolderId: null };
    },

    computed: {
        mediaRepository() {
            return this.repositoryFactory.create('media');
        },
        uploadTag() {
            return `cms-element-vape-hero-${this.element.id}`;
        },
        previewSource() {
            return this.element?.data?.media?.id ? this.element.data.media : null;
        },
        categoryCriteria() {
            return new Criteria(1, 25);
        },
        alignmentOptions() {
            return [
                { value: 'flex-start', label: this.$t('vape-cms.elements.hero.config.alignTop') },
                { value: 'center',     label: this.$t('vape-cms.elements.hero.config.alignCenter') },
                { value: 'flex-end',   label: this.$t('vape-cms.elements.hero.config.alignBottom') },
            ];
        },
    },

    created() {
        this.initElementConfig();          // ⚠️ 6.7: NO argument
    },

    methods: {
        async onSelectionChanges(mediaEntity) {
            const media = mediaEntity[0];
            this.element.config.media.value = media.id;
            this.element.data.media = media;
        },
        onMediaRemove() {
            this.element.config.media.value = null;
            this.element.data.media = null;
        },
    },
};
```

`config/vape-cms-el-config-hero.html.twig`:
```twig
{% block vape_cms_element_hero_config %}
<div class="vape-cms-el-config-hero">
    <sw-tabs
        position-identifier="vape-cms-element-config-hero"
        default-item="content"
    >
        <template #default="{ active }">
            <sw-tabs-item name="content" :active-tab="active">
                {{ $t('sw-cms.elements.general.config.tab.content') }}
            </sw-tabs-item>
            <sw-tabs-item name="settings" :active-tab="active">
                {{ $t('sw-cms.elements.general.config.tab.settings') }}
            </sw-tabs-item>
        </template>

        <template #content="{ active }">
            {# ---------- CONTENT TAB ---------- #}
            <sw-container v-if="active === 'content'">

                {# TEXT — Meteor: plain v-model #}
                <sw-cms-inherit-wrapper
                    field="headline"
                    :element="element"
                    :label="$t('vape-cms.elements.hero.config.headline')"
                >
                    <template #default="{ isInherited }">
                        <mt-text-field
                            v-model="element.config.headline.value"
                            :disabled="isInherited"
                        />
                    </template>
                </sw-cms-inherit-wrapper>

                {# MEDIA #}
                <sw-media-upload-v2
                    variant="regular"
                    :upload-tag="uploadTag"
                    :source="previewSource"
                    :allow-multi-select="false"
                    :label="$t('vape-cms.elements.hero.config.media')"
                    @selection-change="onSelectionChanges"
                    @media-upload-remove-image="onMediaRemove"
                />

                {# ENTITY SINGLE SELECT — legacy sw-*: v-model:value #}
                <sw-entity-single-select
                    v-model:value="element.config.categoryId.value"
                    entity="category"
                    :criteria="categoryCriteria"
                    :label="$t('vape-cms.elements.hero.config.category')"
                    show-clearable-button
                />

                {# RICH TEXT #}
                <sw-text-editor
                    v-model:value="element.config.body.value"
                    :label="$t('vape-cms.elements.hero.config.body')"
                />
            </sw-container>

            {# ---------- SETTINGS TAB ---------- #}
            <sw-container v-if="active === 'settings'" columns="1fr 1fr" gap="30px">

                {# SELECT — Meteor: v-model + :options #}
                <mt-select
                    v-model="element.config.verticalAlign.value"
                    :options="alignmentOptions"
                    :label="$t('sw-cms.elements.general.config.label.verticalAlign')"
                />

                {# NUMBER #}
                <mt-number-field
                    v-model="element.config.minHeightPx.value"
                    number-type="int"
                    :min="0"
                    :max="2000"
                    :label="$t('vape-cms.elements.hero.config.minHeight')"
                />

                {# BOOLEAN #}
                <mt-switch
                    v-model="element.config.newTab.value"
                    :label="$t('vape-cms.elements.hero.config.newTab')"
                    bordered
                />

                {# COLOUR #}
                <mt-colorpicker
                    v-model="element.config.overlayColor.value"
                    :label="$t('vape-cms.elements.hero.config.overlayColor')"
                    color-output="hex"
                />
            </sw-container>
        </template>
    </sw-tabs>
</div>
{% endblock %}
```

### 3.4 `sw-cms-inherit-wrapper` ✅ VERIFIED

Wrap fields so merchants can inherit-or-override from a parent layout (product detail / category pages):
```twig
<sw-cms-inherit-wrapper field="title" field-path="source" :element="element" :label="…"
                        @inheritance:restore="onRestoreInheritance">
    <template #default="{ isInherited }">
        <mt-text-field v-model="element.config.title.value" :disabled="isInherited" />
    </template>
</sw-cms-inherit-wrapper>
```
`field-path` (optional) targets a sub-path such as `source` rather than `value`.

---

## 4. Vue 3 / Meteor changes in 6.7 — what breaks vs 6.5

| Area | 6.5 | 6.7 | Verified |
|---|---|---|---|
| **Vue** | Vue 3 **with** Vue-2 compat layer | Compat layer **removed** | ✅ release notes |
| **Admin templates** | `.html.twig` imported into `index.js` | **Still `.html.twig`** — NOT SFC | ✅ core source |
| **Component registration** | `register('x', { template, … })` | `register('x', () => import('./component'))`, component is `export default {}` | ✅ core source |
| **Options API** | Options API | **Still Options API** in core CMS | ✅ core source |
| **Element mixin init** | `initElementConfig('name')` | **`initElementConfig()` — no arg** | ✅ mixin source, diffed vs v6.5.8.8 |
| **State** | Vuex `Shopware.State` | **Pinia `Shopware.Store`** | ✅ release notes + mixin |
| **Store helpers** | `mapState`, `mapGetters` … | renamed `mapVuexState`, `mapVuexGetters` … | ✅ release notes |
| **i18n** | `$tc(...)` | vue-i18n v10; `tc` removed, core CMS uses **`$t`** | ✅ core source |
| **UI kit** | `sw-button`, `sw-card`, `sw-field` … | `mt-button`, `mt-card`, `mt-text-field` … (~20 swapped) | ✅ release notes |
| **Binding** | `v-model="x"` broadly | `mt-*` → `v-model`; `sw-*` selects → `v-model:value` | ✅ core source |
| **Build (admin)** | webpack | **Vite** | ✅ UPGRADE-6.7 |
| **Components async** | sync | **async by default** — `ref` access may be undefined | ✅ RELEASE_INFO-6.7 |
| **Block `component` prop** | ignored, derived from type | **honoured** | ✅ UPGRADE-6.7 |

### 4.1 Answer: are admin components still `.html.twig`?

**Yes.** ✅ VERIFIED — every CMS element/block in v6.7.12.1 does:
```javascript
import template from './sw-cms-el-product-slider.html.twig';
import './sw-cms-el-product-slider.scss';
export default { template, mixins: [Mixin.getByName('cms-element')], /* … */ };
```
There is **no** migration to Vue SFC in 6.7. Twig-block-based template overriding of core admin templates still works. `.vue` SFCs are *supported* by the Vite pipeline but core does not use them for CMS.

### 4.2 `Shopware.Component.register` vs the "new pattern"

`Shopware.Component.register(name, factory)` is still the API. What changed is the **second argument**: an async factory rather than an options object. `Shopware.Component.extend(newName, extendsName, factory)` also still exists — ✅ verified in `elements/category-name/index.ts`:
```javascript
Shopware.Component.extend('sw-cms-el-category-name', 'sw-cms-el-text', () => import('./component'));
```
`Shopware.Component.override(name, factory)` remains the way to patch a core component.

---

## 5. Theme plugin vs separate plugin

### 5.1 Verdict: **ONE theme plugin.** ✅ VERIFIED by source

A Shopware theme **is** a plugin. From `ThemeCreateCommand::getBootstrapTemplate()`:

```php
<?php declare(strict_types=1);

namespace #namespace#;

use Shopware\Core\Framework\Plugin;
use Shopware\Storefront\Framework\ThemeInterface;

class #class# extends Plugin implements ThemeInterface
{
}
```

And `ThemeInterface` is a **pure marker interface** — ✅ verified, `src/Storefront/Framework/ThemeInterface.php` has an empty body. It carries zero methods and imposes zero restrictions.

**Therefore a theme plugin can do everything a normal plugin can**: ship `Resources/app/administration/` with CMS elements/blocks, register services, add entities, subscribe to events, ship migrations. There is **no technical reason** to split into theme + plugin for this project, and splitting adds real cost (two plugins to install/activate in the right order, two build artefacts, cross-plugin snippet/asset coordination).

**Split only if** you need the CMS elements to work on sales channels that use a *different* theme, or you plan to sell the elements separately.

### 5.2 Scaffold ✅ VERIFIED (exact output of `bin/console theme:create VapeTheme`)

```
custom/plugins/VapeTheme/
├── composer.json
└── src/
    ├── VapeTheme.php
    └── Resources/
        ├── theme.json
        └── app/storefront/
            ├── dist/storefront/js/vape-theme/vape-theme.js
            └── src/
                ├── main.js
                ├── assets/.gitkeep
                └── scss/
                    ├── base.scss
                    └── overrides.scss
```
Flags: `--static` puts it in `custom/static-plugins/` instead. Directory is `custom/plugins/<PluginName>`; name must start uppercase, ≥4 chars, `^[A-Za-z]\w{3,}$`.

Generated `composer.json` ✅ VERIFIED:
```json
{
  "name": "swag/theme-skeleton",
  "description": "Theme skeleton plugin",
  "type": "shopware-platform-plugin",
  "license": "MIT",
  "autoload": { "psr-4": { "VapeTheme\\": "src/" } },
  "extra": {
    "shopware-plugin-class": "VapeTheme\\VapeTheme",
    "label": { "de-DE": "…", "en-GB": "…" }
  }
}
```

You then just add `src/Resources/app/administration/src/main.js` + the `module/sw-cms/...` tree to the same plugin.

### 5.3 `theme.json` ✅ VERIFIED (exact `theme:create` template)

```json
{
  "name": "VapeTheme",
  "author": "Shopware AG",
  "views": [
     "@Storefront",
     "@Plugins",
     "@VapeTheme"
  ],
  "style": [
    "app/storefront/src/scss/overrides.scss",
    "@Storefront",
    "app/storefront/src/scss/base.scss"
  ],
  "script": [
    "@Storefront",
    "app/storefront/dist/storefront/js/vape-theme/vape-theme.js"
  ],
  "asset": [
    "@Storefront",
    "app/storefront/src/assets"
  ]
}
```

**How `style` / `script` arrays work** — order is compile/concat order, and that is the whole mechanism:

- `style`: SCSS entrypoints concatenated in listed order, then compiled by the **PHP SCSS compiler** (`ScssPhpCompiler`). The canonical ordering is:
  1. `overrides.scss` **first** — must precede `@Storefront` because Bootstrap/Shopware variables use `!default`; a value set after the default has already been consumed has no effect.
  2. `@Storefront` — core styles.
  3. `base.scss` — your own rules, last so they win on specificity ties.
- `script`: JS files concatenated in order and served as the theme bundle. Note it points at **`dist/`** (the built artefact), not `src/` — the storefront JS build is a separate step (§7).
- `views`: Twig namespace resolution order, later wins. `@Storefront` → `@Plugins` → `@YourTheme` means your theme can override any plugin, and plugins can override core.
- `asset`: directories copied to `public/theme/<hash>/`.
- `config.fields`: theme manager fields. Types seen in core: `color`, `fontFamily`, `media`, `number`, plus `switch`/`checkbox`, `text`, `select`. Keys: `type`, `value`, `editable`, `block`, `order`, `fullWidth`.
- `previewMedia`, `description`, `configInheritance` (6.4.8+) also valid.

> ⚠️ Note the **default Storefront `theme.json` has no `views` key** ✅ VERIFIED — only `theme:create` output includes it. Both are valid.

> ⚠️ **6.7 → 6.8 deprecation** ✅ VERIFIED in `UPGRADE-6.7.md`: theme config `label`/`helpText` now use **constructed snippet keys**; inline label objects still work in 6.7 but become mandatory-snippet in 6.8. Ship admin snippet files for theme config labels now to avoid rework.

### 5.4 Vite vs webpack in 6.7 — **the user's assumption is only half right**

**Administration → Vite. Storefront main build → still webpack.** ✅ VERIFIED.

From `composer.json` at v6.7.12.1:
```json
"build:js:admin": [
  "@php bin/console bundle:dump",
  "@php bin/console feature:dump",
  "@admin:generate-entity-schema-types",
  "@npm:admin run build",
  "@php bin/console assets:install"
],
"build:js:storefront": [
  "@php bin/console bundle:dump",
  "@php bin/console feature:dump",
  "@npm:storefront run production",
  "cd src/Storefront/Resources/app/storefront && node copy-to-vendor.js",
  "@php bin/console assets:install",
  "@php bin/console theme:compile --sync || true"
]
```
`npm run production` in the storefront package is the **webpack** build. `UPGRADE-6.7.md` is explicit: *"We are switching the build system for **our administration** from webpack to vite."* The dedicated migration doc adds: *"For apps, there are no consequences."*

**However — Vite HAS landed in the storefront in 6.7, in two narrower ways** ✅ VERIFIED in `RELEASE_INFO-6.7.md`:

1. **New Vite-based storefront dev-server** (proxy-free HMR):
   ```
   composer storefront:dev-server
   ```
   ✅ verified script: `bundle:dump` + `feature:dump` + `theme:dump` + `npm:storefront run dev:server`.
   The old `composer watch:storefront` (webpack `hot-proxy`) is **deprecated for the next major**.

2. **New Storefront Component System (since 6.7.11.0)** — Symfony UX Twig Components in `Resources/views/components/`, whose co-located `.scss` is **compiled by Vite, not the PHP SCSS compiler**, and whose `.js` auto-initialises via ES modules. Uses CSS custom properties (`var(--sw-color-brand-primary)`) instead of SCSS theme variables. Release notes call it *"one foundation of a new content system, which will be released at a later stage."*

**Practical guidance for this project:** build your theme's SCSS/JS the classic way (`theme.json` `style`/`script`, webpack for storefront JS). Use `composer storefront:dev-server` for day-to-day DX. Treat the Twig UX component system as promising-but-young (landed 6.7.11.0) — do not build the whole storefront on it yet, but it is the strategic direction and pairs naturally with the CMS-everything rule.

**Plugin admin Vite config** ✅ VERIFIED (docs): only needed if you previously had a custom webpack config.
- New file: `<Plugin>/src/Resources/app/administration/src/vite.config.mts`
- Delete: `<Plugin>/src/Resources/app/administration/build/webpack.config.js`
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: { '@example': 'src/example' },
    },
});
```
Plugin builds are still driven by `composer build:js:admin`, which discovers plugin Vite configs automatically. **If you have no custom webpack config, you need no Vite config at all.**

> ⚠️ **Distribution:** `UPGRADE-6.7.md` — *"you will need to distribute a separate plugin version starting for 6.7, when you extend the administration."* Admin build output is not cross-compatible between 6.6 and 6.7.

---

## 6. CMS-managed header / footer in 6.7

**Answer: No native CMS-editable header/footer. Still hardcoded Twig.** ⚠️ Verified as an absence — I searched `UPGRADE-6.7.md` and `RELEASE_INFO-6.7.md` for CMS/header coupling and found none. Absence of evidence, but the search was thorough across both changelogs.

What 6.7 **did** add is **ESI-based header/footer**, which is an architectural step toward it and is immediately useful.

### 6.1 ESI header/footer ✅ VERIFIED (`UPGRADE-6.7.md` + core `base.html.twig`)

- New routes `/header` and `/footer`; new entry templates `@Storefront/storefront/layout/header.html.twig` and `…/footer.html.twig`.
- Included via `render_esi`, cached **separately** from the page.
- New blocks `base_esi_header` / `base_esi_footer` in `base.html.twig` to replace them wholesale (core uses this for the minimal checkout header).

Core `base.html.twig` ✅ VERIFIED:
```twig
{% block base_esi_header %}
    {{ render_esi(path('frontend.header', { headerParameters: headerParameters }), { ignore_errors: false } ) }}
{% endblock %}
```

Passing custom data into the ESI ✅ VERIFIED:
```twig
{# base.html.twig override #}
{% sw_extends '@Storefront/storefront/base.html.twig' %}
{% block base_esi_header %}
    {% set headerParameters = headerParameters|merge({ 'vapeTheme': { 'activeRoute': activeRoute } }) %}
    {{ parent() }}
{% endblock %}
```
```twig
{# layout/header.html.twig override #}
{% sw_extends '@Storefront/storefront/layout/header.html.twig' %}
{% block header %}
    {{ dump(headerParameters.vapeTheme.activeRoute) }}
{% endblock %}
```
Plus a PHP subscriber can inject parameters (e.g. sales channel id) when `_route === 'frontend.header'`.

⚠️ **6.7.0.1 behaviour change** ✅ VERIFIED: ESI render errors are **no longer silently ignored** (`ignore_errors: false`). A previously-hidden Twig error in your header now takes down the page. Test header overrides carefully.

⚠️ **Removals** ✅ VERIFIED: `Page::$header` / `$footer` / `$salesChannelShippingMethods` / `$salesChannelPaymentMethods` and their accessors are **gone**, as are the corresponding properties on `ErrorTemplateStruct`. `GenericPageLoader` no longer loads them. Extend `HeaderPageletLoader` / `FooterPageletLoader` instead. Twig migrations: `page.header.activeCurrency` → `context.currency`.

### 6.2 How to actually get a CMS-editable header/footer

No native support, so the pragmatic pattern (this is **design guidance, not a documented feature**):

1. Create a CMS layout of type `page` / `landingpage` in Shopping Experiences to hold the header content.
2. Store its id in a theme config field or system config.
3. In your `layout/header.html.twig` override, load that CMS page (a custom controller/pagelet or a Twig-accessible service) and render it with the standard `cms-page` template chain.
4. Because header/footer are ESI-cached separately, the extra load is cached independently — which is exactly why 6.7's ESI change makes this viable where it was costly before.

Watch the roadmap: release notes describe the Twig UX component system as the foundation of *"a new content system, which will be released at a later stage."* Native CMS header/footer is plausibly part of that.

---

## 7. Build, cache & gotchas

### 7.1 The commands that actually exist ✅ VERIFIED

`bin/build-administration.sh` and `bin/watch-administration.sh` **do not exist in the 6.7 core repo.** `bin/` contains only: `ci`, `console`, `exec-with-env`, `install-extension-npm`, `pre-commit`, `pre-push`, `shopware`. Those shell scripts belong to the older `shopware/production` template / `development` setups. On a modern 6.7 project use the **composer scripts**:

| Task | Command | Verified |
|---|---|---|
| Build admin (incl. plugins) | `composer build:js:admin` | ✅ |
| Build storefront | `composer build:js:storefront` | ✅ |
| Build both | `composer build:js` | ✅ |
| Watch admin (HMR) | `composer watch:admin` | ✅ |
| Watch storefront (legacy proxy, **deprecated**) | `composer watch:storefront` | ✅ |
| **Storefront dev-server (new, Vite)** | `composer storefront:dev-server` | ✅ |
| Compile themes | `bin/console theme:compile` | ✅ |
| Refresh theme.json changes | `bin/console theme:refresh` | ✅ docs |
| Dump theme config for watchers | `bin/console theme:dump` | ✅ |
| Register plugin | `bin/console plugin:refresh` | ✅ |
| Install + activate | `bin/console plugin:install --activate VapeTheme` | ✅ |
| Assign theme to channel | `bin/console theme:change` | ✅ |

`shopware-cli project dev` is the modern all-in-one wrapper (admin + storefront watchers with HMR) — mentioned in the installation docs.

### 7.2 `theme:compile` flags ✅ VERIFIED (from `ThemeCompileCommand::configure()`)

```
-k, --keep-assets        Keep current assets, do not delete them
-a, --active-only        Compile themes only for active sales channels
-o, --only <ids>         Compile only for given sales channel ids
-s, --skip <ids>         Skip given sales channel ids
-O, --only-themes <ids>  Compile only given theme ids
-S, --skip-themes <ids>  Skip given theme ids
    --sync               Compile synchronously
```

### 7.3 `--skip-asset-build` ✅ VERIFIED

Defined on `AbstractPluginLifecycleCommand`, so available on `plugin:install`, `plugin:activate`, `plugin:deactivate`, `plugin:uninstall`, `plugin:update`:
```
-r, --refresh            Refresh plugins before executing
-c, --clearCache         Clear cache after executing
    --skip-asset-build   Skip asset building
```
Use `--skip-asset-build` when you will run `composer build:js:admin` yourself — plugin activation otherwise triggers a full (slow) asset build. **On a dev machine, activating a CMS-heavy plugin without this flag can add minutes per activation.**

### 7.4 Cache-clear vs rebuild — the decision table

This is the highest-value gotcha; the two failure modes look identical (your change simply doesn't appear).

| You changed | You must run |
|---|---|
| Storefront `.html.twig` | Nothing in `dev`. In `prod`: `bin/console cache:clear` |
| **Admin** `.html.twig` / `.js` (CMS element or block) | **`composer build:js:admin`** — cache clear does nothing |
| `theme.json` (style/script/asset lists) | `bin/console theme:refresh` then `theme:compile` |
| `theme.json` `config.fields` | `theme:refresh` + `theme:compile` + **admin reload** |
| Theme SCSS | `bin/console theme:compile` (or dev-server) |
| Theme storefront JS (`src/`) | `composer build:js:storefront` → updates `dist/` → `theme:compile` |
| PHP (resolver, subscriber, services.xml) | `bin/console cache:clear` |
| New plugin on disk | `plugin:refresh` → `plugin:install --activate` |
| Snippets | `cache:clear` (storefront) / admin rebuild (admin) |

> **The single most common mistake:** editing an admin CMS element and running `cache:clear`. The administration is a **compiled JS bundle** — PHP cache clearing has zero effect on it. You must rebuild (or be running `composer watch:admin`).

### 7.5 "My element/block doesn't appear" — checklist

1. **Not imported.** `main.js` must `import './module/sw-cms/elements/<name>';`. No import → no registration → silent absence.
2. **Admin not rebuilt.** See §7.4.
3. **`flag: false`.** ✅ VERIFIED — `registerCmsElement`/`registerCmsBlock` return `false` immediately if `config.flag === false`. Silent no-op.
4. **Missing `name` or `component`.** Same silent early return.
5. **`allowedPageTypes` excludes the current layout type.** ✅ VERIFIED — `isElementAllowedInPageType` / `isBlockAllowedInPageType`. If set, the element only appears on those page types. Omit it to allow everywhere.
6. **`hidden: true`.**
7. **Block `component` mismatch** — 6.7 now honours it (§2.5).
8. **Slot names disagree** between `slots: {}` and `<slot name="…">`.
9. **Storefront filename typo** — `sw_include … ignore missing` swallows the error (§1.5).
10. **Storefront template not found because the plugin isn't in `views`** — theme `theme.json` `views` order, or plugin not active.

### 7.6 Database entries — verified position

**No manual DB entries are required for an element or block to appear in the CMS editor.** Registration is purely client-side JS; `cms_slot.type` rows are written when a merchant saves a layout. There is no `cms_element` registry table to seed.

You **do** need DB/migration work only if you want to **ship a pre-built layout** (rows in `cms_page`, `cms_section`, `cms_block`, `cms_slot`, plus `*_translation`) — e.g. a default landing page. That is a plugin migration writing UUIDs, and is a separate concern from making elements available.

⚠️ Not independently verified at 6.7.12.1: whether any core code path requires an element to be present in a DB enum. I found none, and the registry is entirely in-memory in `cms.service.ts`, which strongly supports the "no DB entries needed" position.

### 7.7 Other traps

- **Async components + `ref`** ✅ VERIFIED: components are async by default in 6.7; `this.$refs.x` may be undefined on `created`/`mounted`. Core recommends `@vue:mounted` to gate access. Core's own product-slider guards with `this.$refs.productHolder?.offsetWidth`.
- **`sw-tabs` needs `position-identifier`** — console error otherwise.
- **Meteor vs legacy binding** — §3.2. Silent save failures.
- **`$tc` → `$t`** — `tc` removed in vue-i18n v10; core CMS uses `$t`.
- **Vuex → Pinia** — `Shopware.State` → `Shopware.Store`. Mixin ✅ VERIFIED uses `Shopware.Store.get('cmsPage')`.
- **`initElementConfig()` takes no argument in 6.7** — passing one is harmless (ignored) but the docs' claim that it's required is wrong; relying on the old behaviour where the arg selected the config is a real bug source.
- **`element.config` vs `element.translated.config`** — using the former for merchant text breaks multi-language stores. §1.5.
- **`data-cms-element-id`** on the block wrapper — omit it and admin live preview can't select the element.
- **ESI errors now throw** (6.7.0.1) — §6.1.
- **Deprecated `block_image_inner`** ✅ VERIFIED in `UPGRADE-6.7.md`: inner blocks of `cms-block-vimeo-video.html.twig` / `cms-block-youtube-video.html.twig` renamed to `block_vimeo_video_inner` / `block_youtube_video_inner`.

---

## 8. Minimal end-to-end checklist for a new CMS element

1. `src/Resources/app/administration/src/module/sw-cms/elements/<name>/index.js` → register 3 components + `registerCmsElement`.
2. `component/`, `config/`, `preview/` — each `index.js` importing its `.html.twig` (+ optional `.scss`), `export default { template, mixins: [Mixin.getByName('cms-element')] }`, and `created() { this.initElementConfig(); }`.
3. Add `import './module/sw-cms/elements/<name>';` to `main.js`.
4. `src/Resources/views/storefront/element/cms-element-<name>.html.twig` — **exact** filename.
5. Snippets for `label` in admin + storefront snippet files.
6. Only if it loads entities for the storefront: PHP resolver + `shopware.cms.data_resolver` tag.
7. Usually wrap it in a custom block (§2) so merchants can drag it in as a unit.
8. `composer build:js:admin` (or have `composer watch:admin` running).
9. Hard-refresh the admin (bundle is cached by the browser).

---

## 9. Documentation accuracy warnings

Things the **official docs currently state that core 6.7 contradicts**:

| Docs say | Core v6.7.12.1 actually does | Impact |
|---|---|---|
| `this.initElementConfig('dailymotion')` | `initElementConfig()` — **no parameter** ✅ verified in mixin | Low (arg ignored) but the docs' mental model is wrong |
| `Shopware.Component.register('x', { template: '…inline…' })` | `register('x', () => import('./component'))` + separate `.html.twig` | Medium — inline works, but diverges from core and loses async |
| Storefront reads `element.config.url.value` | Core uses `element.translated.config.*` and `element.fieldConfig.elements.*` | **High — breaks multi-language** |
| Block category list "text, image, video, commerce, form, sidebar" | Also `text-image`, `html`, `app` ✅ verified | Low |
| `services.php` for resolver registration | `services.xml` is equally valid and more common | None |
| Vite migration framed as build-system-wide | **Admin only**; storefront main build is still webpack ✅ verified | **High — plan accordingly** |

Things I could **NOT** fully verify and am flagging as inferred:

- **`mt-colorpicker`, `mt-textarea`, `mt-checkbox` exact prop names** — these are Meteor library components; I verified `mt-text-field`, `mt-number-field`, `mt-switch`, `mt-select`, `mt-banner`, `mt-icon` in core CMS source, but the colorpicker/textarea/checkbox names are extrapolated from the documented `sw-*` → `mt-*` rename. **Check against the Meteor component library before relying on their props.**
- **`sw-dynamic-url-field`** — commonly used for CMS URL fields in older versions; not observed in the 6.7.12.1 CMS element configs I read. May or may not still exist.
- **`sw-media-upload-v2` / `sw-text-editor` at 6.7.12.1** — still `sw-*` (not Meteor-migrated) per the ~20-component rename scope, and widely used, but I did not open a 6.7 CMS config that uses them (the product-slider config uses entity selects, not media). High confidence, not directly verified.
- **Native CMS header/footer absence** — verified as absence-of-mention across both 6.7 changelogs, which is strong but not the same as a positive statement.
- **DB entries for CMS elements** — no requirement found and the architecture argues against one, but I did not exhaustively audit every core code path.

---

## 10. Source URLs

**Core source (tag `v6.7.12.1`)** — all `✅ VERIFIED` claims trace here:
- `https://raw.githubusercontent.com/shopware/shopware/v6.7.12.1/src/Administration/Resources/app/administration/src/module/sw-cms/service/cms.service.ts`
- `.../module/sw-cms/mixin/sw-cms-element.mixin.ts`
- `.../module/sw-cms/elements/product-slider/{index.ts,component/index.js,config/index.js,config/sw-cms-el-config-product-slider.html.twig}`
- `.../module/sw-cms/elements/{image/index.ts,image/config.constant.ts,text/index.ts,form/index.ts,category-name/index.ts}`
- `.../module/sw-cms/blocks/text-image/image-text/{index.ts,component/index.js,component/sw-cms-block-image-text.html.twig,preview/index.js}`
- `https://raw.githubusercontent.com/shopware/shopware/v6.7.12.1/src/Core/Content/Cms/DataResolver/FieldConfig.php`
- `.../src/Core/Content/Cms/DataResolver/Element/AbstractCmsElementResolver.php`
- `.../src/Core/Framework/Plugin/Command/Lifecycle/AbstractPluginLifecycleCommand.php`
- `.../src/Storefront/Framework/ThemeInterface.php`
- `.../src/Storefront/Theme/Command/{ThemeCreateCommand.php,ThemeCompileCommand.php}`
- `.../src/Storefront/Resources/theme.json`
- `.../src/Storefront/Resources/views/storefront/{base.html.twig,layout/header.html.twig,block/cms-block-image-text.html.twig,element/cms-element-image.html.twig,element/cms-element-product-slider.html.twig,section/cms-section-default.html.twig}`
- `https://raw.githubusercontent.com/shopware/shopware/v6.7.12.1/{composer.json,UPGRADE-6.7.md,RELEASE_INFO-6.7.md}`

**Documentation:**
- https://developer.shopware.com/docs/guides/plugins/plugins/content/cms/add-cms-element.html
- https://developer.shopware.com/docs/guides/plugins/plugins/content/cms/add-cms-block.html
- https://developer.shopware.com/docs/guides/plugins/plugins/content/cms/add-data-to-cms-elements.html
- https://developer.shopware.com/docs/guides/plugins/themes/theme-configuration.html
- https://developer.shopware.com/docs/guides/plugins/themes/create-a-theme.html
- https://developer.shopware.com/docs/guides/plugins/plugins/administration/system-updates/vite.html
- https://developer.shopware.com/docs/guides/upgrades-migrations/administration/vite.html
- https://developer.shopware.com/docs/guides/plugins/plugins/administration/templates-styling/writing-templates.html
- https://developer.shopware.com/docs/concepts/framework/storefront-components.html
- https://developer.shopware.com/release-notes/6.7/6.7.0.0.html
- https://developer.shopware.com/resources/admin-extension-sdk/api-reference/cms/registerCmsElement.html
