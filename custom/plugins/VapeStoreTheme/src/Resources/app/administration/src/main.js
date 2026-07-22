/*
24VapeStore — Administration giriş noktası
==================================================
ALTIN KURAL: her storefront component'i CMS editöründen sürükle-bırak ile
yerleştirilebilir ve düzenlenebilir olmalı.

Her yeni CMS element ve block BURADA import edilmek ZORUNDA.
Import edilmeyen element/block admin'de sessizce görünmez —
dosyalar diskte olsa bile. En sık yapılan hata budur.
*/

// ==================================================
// CMS Elements
// ==================================================
import './module/sw-cms/elements/vape-hero';

// ==================================================
// CMS Blocks
// ==================================================
import './module/sw-cms/blocks/image/vape-hero';
