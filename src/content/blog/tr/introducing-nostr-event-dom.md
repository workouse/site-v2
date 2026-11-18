---
title: "Karşınızda <nostr-event>: Sıfır Bağımlılıklı Nostr Web Component"
description: "Merkeziyetsiz Nostr profillerini, notlarını, uzun makalelerini ve medyalarını hiçbir framework bağımlılığı olmadan, aşamalı geliştirme, katı XSS koruması ve yerel CSS desteğiyle sitenize nasıl gömeceğinizi keşfedin."
pubDate: 2026-09-18
author: "delirehberi"
lang: "tr"
tags: ["Nostr", "Web Components", "Open Source", "JavaScript", "TypeScript", "Progressive Enhancement", "HTML5", "Decentralization"]
draft: false
---

[**Nostr**](https://nostr.org.tr) gibi merkeziyetsiz protokoller, sansüre dayanıklı ve açık iletişimin küresel ölçekte çalıştığını kanıtladı. Basit kriptografik anahtar çiftleri (`npub`/`nsec`) ve dağıtık WebSocket röleleri (relay) sayesinde kullanıcılar kendi kimliklerine, sosyal bağlantılarına ve içeriklerine aracısız sahip oluyor.

Ancak Nostr içeriğini geleneksel web sitelerinde, bloglarda veya dokümantasyon sayfalarında gömmek (embed etmek) bugüne kadar geliştiriciler için oldukça zahmetliydi.

Mevcut çözümlerin çoğu geliştiricileri React, Vue veya Svelte gibi ağır framework çalışma zamanlarını yüklemeye zorluyor, stil çakışmalarına yol açıyor ve bech32 formatı için karmaşık kod blokları gerektiriyordu. Daha da önemlisi, genel açık rölelerden gelen filtrelenmemiş kullanıcı içeriklerini doğrudan tarayıcıda göstermek ciddi **Siteler Arası Betik Çalıştırma (XSS)** açıklarına davetiye çıkarıyordu.

Bugün, [**nostr.org.tr**](https://nostr.org.tr) topluluğu tarafından geliştirilen açık kaynaklı [**`@nostr-org-tr/nostr-event-dom`**](https://github.com/Nostr-org-tr/nostr-event-dom) paketini tanıtmaktan mutluluk duyuyoruz. Bu sıfır bağımlılıklı ve framework bağımsız Custom Element (`<nostr-event>`), açık web standartları üzerinde güvenli, hafif ve aşamalı geliştirme (progressive enhancement) destekli bir Nostr kartı sunuyor.

---

## 1. Web'e İçerik Gömmek Neden Zordu?

Twitter veya YouTube gibi merkezi platformlar, sitelere içerik eklemek için çoğunlukla hantal `<iframe>` yapıları kullanır. Bu iFrame'ler arama motorlarını engeller, sayfa performansını düşürür, ziyaretçileri izler ve özel CSS ile stil verilmesini imkansız kılar.

Geliştiriciler Nostr için yerel bileşenler üretmek istediğinde şu temel engellerle karşılaşıyordu:

| Karşılaşılan Zorluk | Geleneksel İstemci SDK'ları / iFrame | `<nostr-event>` Web Component |
| :--- | :--- | :--- |
| **Framework Bağımlılığı** | React, Vue veya Svelte zorunluluğu | **Sıfır bağımlılık**; doğrudan yerel Web Component |
| **CSS ve Stil İzolasyonu** | Genel CSS çakışmaları ve tasarım bozulması | **Shadow DOM kapsülleme**; CSS değişkenleri & `::part()` |
| **Güvenlik ve XSS** | Röleden gelen zararlı script riski | **Katı HTML sanitizasyonu** ve protokol beyaz listesi |
| **SEO ve No-JS Desteği** | JS olmayan istemcilerde boş alan | **Aşamalı geliştirme**; anlamsal `<a>` link yedeği |
| **Paket Boyutu** | 150KB+ runtime yükü | **~15KB sıkıştırılmış (gzipped)** |

---

## 2. Aşamalı Geliştirme (Progressive Enhancement) ve Mimari

Bileşen, aşamalı geliştirme felsefesine dayanır. Sayfanıza JavaScript olmadan da çalışan standart bir HTML bağlantısı eklersiniz. Arama motorları ve botlar içeriği normal bir bağlantı olarak indeksler. JavaScript yüklendiğinde ise tarayıcı bu elementi otomatik olarak modern ve etkileşimli bir karta dönüştürür.

```text
+-----------------------------------------------------------------------+
|  HTML İşaretlemesi (Sunucu Taraflı / Arama Motorları / No-JS):        |
|  <nostr-event>                                                        |
|    <a href="nostr:npub1...">Nostr'da fiatjaf profilini görüntüle</a>  |
|  </nostr-event>                                                       |
+-----------------------------------------------------------------------+
                                   |
                                   v  (JavaScript Yüklenir & Canlanır)
+-----------------------------------------------------------------------+
|  Shadow DOM Sınırı (Kapsüllenmiş CSS & Arındırılmış İçerik):          |
|  #shadow-root (open)                                                  |
|    ├── <style> (Tema Değişkenleri: --ne-card-bg, --ne-accent vb.)    |
|    └── <article part="card">                                          |
|          ├── <header part="header"> (Avatar, İsim, NIP-05 Rozeti)     |
|          ├── <div part="body"> (Temizlenmiş Metin, Linkler, Medya)    |
|          └── <footer part="footer"> (Tarih, Protokol Bağlantısı)      |
+-----------------------------------------------------------------------+
```

`<nostr-event>` DOM'a bağlandığında:
1. `event` özniteliğini (bech32 dizesi, hex kimliği, NIP-05 tanıtıcısı veya JSON) okur.
2. Doğrudan JSON verilmişse, hiçbir ağ gecikmesi olmadan anında ekrana basar.
3. Bir tanımlayıcı (`note1...`, `nevent1...`, `naddr1...`, `npub1...` veya `isim@alanadi.com`) verilmişse, tanımlı WebSocket rölelerini paralel olarak sorgular ve bellek içi önbellekleme yapar.
4. Tüm metin ve medya içeriklerini katı güvenlik filtrelerinden geçirdikten sonra izole Shadow DOM içine yerleştirir.

---

## 3. Desteklenen Nostr Kind Türleri

Nostr yalnızca kısa metin notlarından ibaret değildir. `<nostr-event>` bileşeni, en yaygın NIP standartları için özel görsel şablonlar içerir:

- **Kind 0 (Kullanıcı Profilleri & NIP-05)**: Kapak görseli, avatar, kullanıcı adı, biyografi, doğrulanmış NIP-05 rozeti, web sitesi ve Lightning adresi (`lud16`).
- **Kind 1 (Kısa Notlar)**: Metin içindeki web bağlantıları, hashtag'ler, NIP-21 `nostr:` etiketleri ve yerleşik resim/video önizlemeleri.
- **Kind 30023 (NIP-23 Uzun Makaleler)**: Biçimlendirilmiş tipografi, kapak resmi, makale başlığı, özet ve konu etiketleri.
- **Kind 31922 & 31923 (NIP-52 Takvim Etkinlikleri)**: Başlangıç/bitiş saatleri, konum bilgisi, organizatör detayları ve etkinlik açıklaması.
- **Kind 20, 21, 22, 1063, 34235 & 34236 (NIP-68 / NIP-71 Medya ve Video)**: Duyarlı 16:9 video oynatıcı, 9:16 dikey kısa video (short) oynatıcı, yüksek çözünürlüklü galeri ve dosya bilgileri.
- **Genel Fallback (Yedek Kart)**: Desteklenmeyen veya deneysel bir kind geldiğinde, katlanabilir ham JSON görüntüleyicisiyle temiz bir bilgi kartı gösterilir.

---

## 4. Sıfır Güven (Zero-Trust) Güvenlik ve XSS Koruması

Merkeziyetsiz ağlarda herkes bir röle çalıştırıp rastgele veri gönderebileceğinden, harici verileri doğrudan web sayfanıza basmak ciddi güvenlik riskleri taşır.

`<nostr-event>` katı bir arındırma hattı işletir:

1. **Güvenli Protokol Beyaz Listesi**: Bağlantılarda ve medya kaynaklarında yalnızca güvenli protokollere izin verilir (`https:`, `http:`, `nostr:`, `web+nostr:`, `lightning:`, `mailto:`, `magnet:`). `javascript:`, `data:` veya `vbscript:` gibi tehlikeli şemalar tamamen ayıklanır.
2. **HTML Varlık Dönüşümü**: Tüm metinler, kullanıcı adları ve biyografiler ayrıştırılmadan önce kesin biçimde escape edilir.
3. **Dinamik Kod veya `eval()` Yoktur**: Bileşen yalnızca yerel web standartlarını kullanır; harici betik çalıştırmaz.
4. **İzole Shadow DOM**: Kapsülleme sayesinde gömülen içerikler ana sayfanızın stil ve betiklerine müdahale edemez.

---

## 5. Hızlı Başlangıç ve Entegrasyon Yöntemleri

`<nostr-event>` bileşenini sitenize dahil etmek bir dakikadan az sürer.

### Yöntem A: CDN Script Etiketi ile Kullanım

HTML dosyanızın `<head>` kısmına script etiketini ekleyin ve dilediğiniz yerde `<nostr-event>` kullanın:

```html
<!-- CDN üzerinden bileşeni yükleyin -->
<script src="https://cdn.jsdelivr.net/npm/@nostr-org-tr/nostr-event-dom/dist/nostr-event.global.js"></script>

<!-- NIP-05 ile Fiatjaf Profilini Gösterin -->
<nostr-event event="fiatjaf@fiatjaf.com"></nostr-event>

<!-- note1 veya nevent1 ile Kısa Not Gösterin -->
<nostr-event event="note1..."></nostr-event>

<!-- naddr1 ile Uzun Yazı Gösterin -->
<nostr-event event="naddr1..."></nostr-event>
```

### Yöntem B: Aşamalı Geliştirme (SEO İçin Önerilen)

Erişilebilir bir HTML bağlantısı tanımlayın. Tarayıcıda JS kapalı olsa bile bağlantı okunabilir kalır:

```html
<nostr-event event="note1...">
  <a href="nostr:note1...">
    Notu Nostr üzerinde görüntüle
  </a>
</nostr-event>
```

### Yöntem C: SSR ve Çevrimdışı Kullanım (Doğrudan JSON)

Sunucu taraflı render (Astro, Next.js, Remix) süreçlerinde veriyi sunucuda çekip JSON olarak aktararak istemci taraflı röle sorgusunu tamamen atlayabilirsiniz:

```html
<nostr-event event='{"id":"...","pubkey":"...","created_at":1700000000,"kind":1,"tags":[],"content":"Merhaba nostr!","sig":"..."}'></nostr-event>
```

Veya TypeScript / JavaScript içerisinden doğrudan nesneyi atayın:

```typescript
const element = document.querySelector('nostr-event');
if (element) {
  element.event = fetchedNostrEvent;
}
```

### Yöntem D: Paket Yöneticisi (npm / yarn / pnpm)

```bash
npm install @nostr-org-tr/nostr-event-dom
```

```typescript
import '@nostr-org-tr/nostr-event-dom';
```

---

## 6. CSS Değişkenleri ve `::part()` ile Temalama

`<nostr-event>`, sitenizin tasarım diline kusursuz uyum sağlar.

### CSS Değişkenleri ile Temayı Değiştirme

```css
nostr-event.ozel-tema {
  --ne-card-bg: #18181b;
  --ne-text: #f4f4f5;
  --ne-text-muted: #a1a1aa;
  --ne-border: #27272a;
  --ne-accent: #f59e0b;
  --ne-accent-hover: #d97706;
  --ne-radius: 16px;
  --ne-font-sans: "Inter", system-ui, sans-serif;
}
```

### `::part()` Seçicileri ile Detaylı Stil Verme

Shadow DOM izolasyonunu bozmadan bileşenin alt parçalarını hedefleyin:

```css
/* Kart konteynerine özel gölge verin */
nostr-event::part(card) {
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
}

/* Yazar ismini kalınlaştırın */
nostr-event::part(name) {
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* NIP-05 doğrulama rozetini renklendirin */
nostr-event::part(nip05) {
  color: #10b981;
}
```

---

## Özet ve Açık Kaynak Topluluğu

Açık web'in geleceği, birlikte çalışabilir ve sade standartlar üzerine kuruludur. `<nostr-event>` ile egemen Nostr içeriğini herhangi bir web sayfasına taşımak artık tek bir HTML etiketinden ibaret.

- ⭐️ **GitHub Deposu**: [Nostr-org-tr/nostr-event-dom](https://github.com/Nostr-org-tr/nostr-event-dom)
- 📦 **NPM Paketi**: [`@nostr-org-tr/nostr-event-dom`](https://www.npmjs.com/package/@nostr-org-tr/nostr-event-dom)
- 🇹🇷 **Nostr Türkiye Topluluğu**: [nostr.org.tr](https://nostr.org.tr)

---

## Merkeziyetsiz Web Çözümlerine mi İhtiyacınız Var?

**[Workouse](https://workouse.com)** olarak, yüksek performanslı web uygulamaları, uç bilişim (edge) mimarileri ve merkeziyetsiz protokol entegrasyonları inşa ediyoruz.

[**Ekibimizle iletişime geçin**](https://workouse.com) ve projenizi birlikte hayata geçirelim.
