---
title: "bridge.nostr.com ile Tanışın: Edge Hızında Webhook'tan Nostr'a İletim Motoru"
description: "GitHub sürümleri, Stripe ödemeleri ve özel HTTP webhook'larını 100ms altında merkeziyetsiz Nostr rölelerine iletme rehberi. Bilo Bunker ile sıfır güven NIP-46 uzaktan imzalama, Liquid şablonlama ve Lightning mikro ödeme mimarisi."
pubDate: 2026-08-18
author: "Emre Yılmaz"
lang: "tr"
tags: ["Nostr", "Webhooks", "NIP-98", "NIP-57", "NIP-46", "Edge Bilişim", "Cloudflare Workers", "Açık Kaynak", "Lightning Network", "TypeScript"]
draft: false
---

**Nostr** gibi merkeziyetsiz sosyal iletişim protokolleri; kimlik yönetimini, içerik yayıncılığını ve gerçek zamanlı etkileşimi kapalı şirket platformlarının tekelinden kurtardı. Açık WebSocket röleleri, asimetrik kriptografi (`npub`/`nsec`) ve protokole yerleşik Lightning Network mikro ödemeleriyle Nostr, sansürlenemez bir iletişim zemini sunuyor.

Buna karşın günümüz interneti **HTTP Webhook** çağrıları üzerinden dönüyor.

Bir geliştirici GitHub'da kod birleştirdiğinde, bir satıcı Stripe üzerinden sipariş aldığında veya bir sunucu izleme alarmı tetiklendiğinde standart Web2 servisleri bir HTTP POST webhook isteği fırlatır. Bugüne kadar bu webhook çağrılarını merkeziyetsiz Nostr ekosistemine bağlamak, 7/24 çalışan kırılgan sunucu betikleri işletmeyi ve özel anahtarları güvensiz ortamlarda saklamayı gerektiren zahmetli bir süreçti.

Bugün, herhangi bir HTTP webhook çağrısını kriptografik olarak imzalanmış Nostr olaylarına dönüştürüp küresel rölelere **100 milisaniyenin altında** ileten [**bridge.nostr.com** (NostrBridge)](https://bridge.nostr.com) projemizi duyurmaktan mutluluk duyuyoruz.

---

## 1. Eksik Bağlantı Halkası: Web2 Webhook'ları vs. Nostr Röleleri

Geleneksel web servislerini Nostr protokolüne bağlamak neden zordu?

| Kriter | Geleneksel Web2 Webhook'ları | Merkeziyetsiz Nostr Röleleri |
| :--- | :--- | :--- |
| **İletişim Protokolü** | Tek yönlü HTTP POST (`POST /webhook`) | Çift yönlü, kalıcı WebSocket bağlantıları |
| **Kimlik Doğrulama** | Başlıklarda paylaşımlı gizli anahtar | Her JSON olayı üzerinde Schnorr kriptografik imzası |
| **Altyapı** | Standart tekil web sunucuları | Birbirinden bağımsız küresel röle ağı |

### Temel Yapısal Zorluklar

1. **Protokol Uyuşmazlığı**: Web2 servisleri standart HTTP çağrıları yapar (`POST /webhook`). Nostr ise kalıcı WebSocket bağlantıları üzerinden JSON-RPC olay dizileri (`["EVENT", { ... }]`) ile haberleşir.
2. **Anahtar Güvenliği Çıkmazı**: Her Nostr paylaşımı için geçerli bir `nsec` özel anahtar imzası gerekir. Geliştiriciler köprü betiklerinde bu anahtarları sunucu ortam değişkenlerinde saklamak zorunda kalıyordu. [Bilo Bunker ve Egemen Nostr Uzaktan İmzalama](/blog/tr/bilo-bunker-self-hosted-nostr-remote-signer) yazımızda belirttiğimiz gibi, sunucularda açık anahtar saklamak büyük bir güvenlik açığıdır.
3. **Altyapı ve Sunucu Bakım Yükü**: Özel bot süreçlerini VPS sunucularında 7/24 ayakta tutmak; süreç yönetimi, TLS sertifikaları ve WebSocket yeniden bağlanma döngüleri gibi operasyonel yükler getirir.

---

## 2. bridge.nostr.com (NostrBridge) Özellikleri

[**bridge.nostr.com**](https://bridge.nostr.com) bu zorlukları sunucusuz bir uç mimariyle çözer:

- ⚡ **100ms Altı Küresel Yürütme**: Dünya genelinde 300'den fazla veri merkezinde çalışan Cloudflare Workers ve Hono altyapısı.
- 🔐 **Sıfır Güven NIP-46 İmzalama**: [Bilo Bunker](/blog/tr/bilo-bunker-self-hosted-nostr-remote-signer) gibi uzaktan imzalayıcılarla yerel entegrasyon. Köprü sunucusu özel anahtarınızı asla görmez.
- 🎨 **Liquid & JSONPath Dinamik Şablonlama**: Gelen JSON verisinden dilediğiniz alanları ayıklayıp zengin Nostr olaylarına, etiketlere ve markdown metinlerine dönüştürün.
- ⚡ **Lightning Zap ile Kullanım Başına Ödeme (NIP-57 / LNURL-pay)**: Aylık kredi kartı aboneliği gerekmez. Bitcoin Lightning Network üzerinden çalıştırma başına mikro ödeme yapın.
- 🌐 **Özel Röle Havuzları**: Olayları aynı anda birden fazla genel veya özel röleye eşzamanlı olarak yayınlayın.
- 📊 **Canlı Denetim Günlüğü**: Gelen HTTP istek başlıklarını, yükleri ve röle onay yanıtlarını anlık olarak inceleyin.

---

## 3. Sıfır Güven Güvenlik Modeli: Anahtarı Açığa Çıkarmadan İmzalama

`bridge.nostr.com` anahtar egemenliğini korumak için çok katmanlı bir imzalama mimarisi sunar:

| İmzalama Katmanı | Güvenlik Düzeyi | Anahtar Saklama | Önerilen Kullanım |
| :--- | :--- | :--- | :--- |
| **1. NIP-46 Remote Bunker** | Maksimum (Sıfır Güven) | Anahtar kendi Bilo Bunker'ınızda kalır | Kişisel kimlik (`npub`), marka hesapları |
| **2. Zarf Şifreli Anahtarlar** | Yüksek | AES-256 KMS, bellekte anlık çözülür | Yüksek hacimli kurumsal botlar |
| **3. Geçici Bot Anahtarları** | Tek Kullanımlık | Durumsuz otomatik üretilen çiftler | Sistem izleme ve tek yönlü log botları |

### 1. Bilo Bunker ile NIP-46 Uzaktan İmzalama (Önerilen)
Kişisel kimliğiniz (`npub`) üzerinden duyuru yayınlıyorsanız, özel anahtarınızı üçüncü taraf bir servise asla vermemelisiniz.

`bridge.nostr.com`'u [**Bilo Bunker**](/blog/tr/bilo-bunker-self-hosted-nostr-remote-signer) ile eşleştirdiğinizde:
1. NostrBridge imzasız olay taslağını hazırlar.
2. Bilo Bunker sunucunuza şifreli bir NIP-46 `sign_event` RPC isteği gönderir.
3. Kendi sunucunuzdaki Bilo Bunker olayı imzalar ve yalnızca geçerli imzayı geri döner.
4. NostrBridge imzalı olayı hedef rölelere iletir.

---

## 4. Şablonlama ve Dönüştürme Mimarisi

NostrBridge, JSON üreten platformlar ile kriptografik Nostr olayları arasında yüksek hızlı bir dönüştürme boru hattı görevi görür:

- **Dinamik Veri Eşleme**: Gelen webhook yüklerindeki iç içe değerleri (örneğin `payload.release.tag_name` veya `payload.order.total_price`) doğrudan özelleştirilebilir şablonların içine aktarın.
- **Yapılandırılabilir Olay Türleri (Kinds)**: Standart kısa notlar (Kind 1), uzun makaleler (Kind 30023), takvim duyuruları (Kind 31923) veya özel uygulama olayları üretin.
- **Özel Röle Hedefleme**: Belirli webhook'ları hedef kitleye, coğrafi dağıtıma veya gizlilik gereksinimlerine göre farklı röle havuzlarına yönlendirin.
- **Tekilleştirme ve Güvenilirlik**: Dahili tekilleştirme motoru sayesinde, harici sistemlerin yeniden denemelerinde bile mükerrer gönderilerin önüne geçilir.

---

## 5. Pratik Webhook Entegrasyon Senaryoları

### Senaryo 1: Otomatik GitHub Sürüm Duyurusu (Kind 1 & Kind 30023)

Yeni bir git etiketi (tag) yayınlandığında takipçilerinize otomatik duyuru yapın.

#### Gelen GitHub Webhook Verisi:
```json
{
  "action": "published",
  "release": {
    "tag_name": "v2.4.0",
    "name": "Bilo Bunker Multi-Tenant Sürümü",
    "html_url": "https://github.com/workouse/bilo-bunker/releases/tag/v2.4.0",
    "body": "NIP-46 izin matrisi ve canlı WebSocket denetim logları eklendi."
  },
  "repository": {
    "full_name": "workouse/bilo-bunker"
  }
}
```

#### NostrBridge Şablonu:
```liquid
🚀 Yeni Açık Kaynak Sürüm: {{ payload.repository.full_name }} {{ payload.release.tag_name }}

{{ payload.release.name }}
{{ payload.release.body }}

📦 Sürüm Detayları:
{{ payload.release.html_url }}

#opensource #nostr #dev #buildinpublic
```

---

### Senaryo 2: Stripe Satış Bildirimi

Mağazanızda her satış gerçekleştiğinde topluluğunuza anlık kutlama mesajı gönderin.

#### Gelen Stripe Webhook Verisi:
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "amount_total": 4900,
      "currency": "usd",
      "customer_details": {
        "name": "Ahmet"
      },
      "custom_fields": [
        { "key": "product_name", "value": "Nostr Geliştirici Paketi" }
      ]
    }
  }
}
```

#### NostrBridge Şablonu:
```liquid
⚡ Yeni Sipariş Tamamlandı!

Teşekkürler {{ payload.data.object.customer_details.name | default: "Anonim Destekçi" }}! ({{ payload.data.object.custom_fields[0].value }})
Tutar: ${{ payload.data.object.amount_total | divided_by: 100 }}.00 {{ payload.data.object.currency | upcase }}

🛒 https://shop.alanadiniz.com
#bitcoin #lightning #ecommerce #nostr
```

---

## 6. Lightning Network ile Kullandıkça Öde

Geleneksel platformlar haftada sadece 5 bildirim atacak olsanız bile aylık 29 dolar sabit abonelik talep eder. 

`bridge.nostr.com` adil fiyatlandırma için Bitcoin Lightning Network'ü (NIP-57 / LNURL-pay) kullanır:

- **Çalıştırma Başına Mikro Ödeme**: Örneğin 100 webhook çağrısı için sadece birkaç satoshi.
- **Kredi Kartı Yok**: Stripe profili, banka hesabı veya otomatik çeken abonelikler bulunmaz.
- **Tek Tıkla Yükleme**: WebLN veya QR kod ile anında bakiye yükleyin.

---

## 7. Açık Kaynak ve Kendi Sunucunuzda Barındırma

`bridge.nostr.com` **PolyForm Noncommercial 1.0.0** lisansı altında tamamen açık kaynaklıdır.

```text
nostr-bridge/
├── apps/
│   ├── api/             # Cloudflare Workers üzerinde Hono API
│   ├── dashboard/       # React SPA (TailAdmin + Tailwind CSS)
│   └── landing/         # Astro.js Tanıtım ve Dokümantasyon sitesi
├── packages/
│   ├── shared/          # Tipler, arayüzler ve Zod şemaları
│   ├── nostr/           # Schnorr imzalama, NIP-98 ve röle havuzları
│   └── config/          # Paylaşılan TypeScript ve ESLint konfigürasyonları
└── pnpm-workspace.yaml  # pnpm monorepo yapılandırması
```

---

## Sonuç

Merkeziyetsiz web izole bir ada olmamalıdır. Mevcut HTTP altyapısını uç bilişim performansı ve sıfır güven kriptografisiyle Nostr'a bağlayan **bridge.nostr.com**, geliştiriciler ve topluluklar için bu köprüyü kuruyor.

- 🌉 **NostrBridge'i Başlatın**: [bridge.nostr.com](https://bridge.nostr.com)
- ⭐️ **GitHub'da İnceleyin**: [workouse/nostr-bridge](https://github.com/workouse/nostr-bridge)
- 🔐 **Kendi İmzalatıcınızı Kurun**: [Bilo Bunker NIP-46 uzaktan imzalayıcı](/blog/tr/bilo-bunker-self-hosted-nostr-remote-signer) rehberimizi okuyun.

---

## Özel Protokol veya Edge Entegrasyonuna mı İhtiyacınız Var?

**[Workouse](https://workouse.com)** olarak kurucular ve şirketler için yüksek performanslı web sistemleri, açık protokol köprüleri ve özel entegrasyonlar geliştiriyoruz.

Projenizi görüşmek için **[mühendislik ekibimizle iletişime geçin](https://workouse.com)**.
