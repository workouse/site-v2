---
title: "Bilo Bunker: Kendi Sunucunuzda Egemen Nostr Uzaktan İmzalayıcı (NIP-46)"
description: "Nostr özel anahtarını (nsec) tarayıcılara yapıştırmanın güvenlik riskleri, NIP-46 uzaktan imzalama (Bunker) protokolünün sıfır güven mimarisi ve Banker Bilo'dan ilham alarak geliştirdiğimiz açık kaynak Bilo Bunker projesinin detayları."
pubDate: 2026-08-17
author: "Emre Yılmaz"
lang: "tr"
tags: ["Nostr", "NIP-46", "Kriptografi", "Siber Güvenlik", "Açık Kaynak", "Self Hosting", "Docker", "TypeScript"]
draft: false
---

Açık ve merkeziyetsiz iletişim protokolü **Nostr** dünyasında, özel anahtarınız (`nsec`) sıradan bir kullanıcı şifresi değildir—**o sizin tüm dijital kimliğiniz, itibarınız ve kriptografik imzanızdır.**

Buna karşın, Nostr ekosistemine yeni katılanların ve hatta deneyimli geliştiricilerin en sık başvurduğu yöntem aynı zamanda en büyük güvenlik açığıdır: **Ham `nsec` anahtarını doğrudan web tarayıcılarına, masaüstü uygulamalarına ve mobil istemcilere kopyalayıp yapıştırmak.**

Bu kritik anahtar yönetimi çıkmazını çözmek için Nostr topluluğu **NIP-46 (Nostr Connect / Uzaktan İmzalayıcılar)** standardını geliştirdi. Bugün, anahtar egemenliğini herkes için erişilebilir kılmak amacıyla geliştirdiğimiz açık kaynaklı, çok kiracılı (multi-tenant) ve tek komutla kurulan uzaktan imzalama platformumuz [**Bilo Bunker**](https://github.com/workouse/bilo-bunker)'ı duyurmaktan heyecan duyuyoruz.

---

## 1. Nostr Protokolüne Giriş: Aracısız ve Sansürsüz Kimlik

Uzaktan imzalamanın detaylarına girmeden önce, Nostr (*Notes and Other Systems Transmitted by Relays*) protokolünün neden bir devrim olduğunu hatırlayalım:

1. **Kriptografik Anahtar Çiftleri ile Kimlik**:
   - **`npub` (Açık Anahtar)**: Herkesin görebileceği, sizi etiketleyebileceği veya takip edebileceği genel kimliğiniz.
   - **`nsec` (Gizli/Özel Anahtar)**: Gönderdiğiniz her notu, özel mesajı, beğeniyi ve profil güncellemesini imzalayan 32 baytlık Schnorr özel anahtarınız.
2. **Hafif WebSocket Röleleri (Relays)**:
   - Röleler oturum açma veya kimlik doğrulama yapmaz. Yalnızca kriptografik olarak imzalanmış JSON olaylarını (events) kabul eder ve abone olan istemcilere iletir.
3. **Sansür Direnci ve Veri Taşınabilirliği**:
   - Bir röle sizi engellese bile kimliğinize dokunamaz. İstemcinizi dünyadaki herhangi bir başka röleye bağladığınız anda takipçileriniz paylaşımlarınızı görmeye devam eder.

| Bileşen | Merkezi Web2 Ağları | Nostr Protokol Modeli |
| :--- | :--- | :--- |
| **Hesap Kimliği** | Merkezi veritabanındaki kullanıcı adı / şifre | Açık kriptografik anahtar çifti (`npub` / `nsec`) |
| **Mesaj Yönlendirme** | Şirkete ait kapalı sunucu kümeleri | Dağıtık ve açık WebSocket röleleri |
| **Veri Sahipliği** | Platform içeriğinize ve ağınıza el koyabilir | Kullanıcı anahtarlarının ve paylaşımlarının tam sahibidir |

Ancak bu tam egemenlik çok büyük bir sorumluluk getirir: **Özel anahtarınızı nasıl koruyacaksınız?**

---

## 2. Anahtar Yönetimi Krizi: nsec Yapıştırmak Neden Tehlikeli?

Geleneksel Web2 sistemlerinde şifrenizi çaldırırsanız *"Şifremi Unuttum"* butonuna basabilir, e-posta veya SMS doğrulamasıyla merkezi sunucudan oturumları sonlandırıp hesabınızı kurtarabilirsiniz.

**Nostr'da merkezi bir sunucu, müşteri hizmetleri veya "Şifremi Unuttum" butonu yoktur.**

Eğer bir saldırgan `nsec` anahtarınızı ele geçirirse:
- Kimliğinizi kalıcı olarak ele geçirir.
- Adınıza geçerli kriptografik imzalarla sahte paylaşımlar yapabilir.
- Geçmiş ve gelecekteki tüm şifreli özel mesajlarınızı (NIP-04 ve NIP-44) okuyabilir.
- Bağlı Lightning cüzdanlarınızı boşaltabilir.

### Web İstemcileri ve XSS Tehdit Vektörleri

Ham `nsec` anahtarınızı web tabanlı bir Nostr istemcisine yapıştırdığınızda bu gizli anahtar genellikle tarayıcı belleğinde (`window`), `localStorage` veya `IndexedDB` üzerinde saklanır:

1. **Siteler Arası Betik Çalıştırma (XSS)**: Web istemcisindeki tek bir XSS açığı, saldırganın tarayıcınızda rastgele JavaScript çalıştırmasına ve `localStorage`'dan ham `nsec` anahtarınızı çalmasına yeterlidir.
2. **Kötü Amaçlı NPM Paketleri ve CDN Zafiyetleri**: Yüzlerce bağımlılık barındıran modern ön yüzlerde tek bir tedarik zinciri saldırısı yapıştırılan anahtarları sessizce toplayabilir.
3. **Zararlı Tarayıcı Eklentileri**: Geniş DOM okuma yetkisine sahip eklentiler form alanlarını ve depolama motorlarını tarayabilir.

### Anahtar Yönetimi Çözümlerinin Karşılaştırması

| Yöntem | Güvenlik Düzeyi | Kullanım Kolaylığı | Saldırı Yüzeyi |
| :--- | :--- | :--- | :--- |
| **Tarayıcıya Ham `nsec` Yapıştırma** | Son Derece Tehlikeli | Yüksek (Basit yapıştır) | Tek bir XSS veya eklenti açığında anahtar çalınır |
| **NIP-07 Eklentisi (Alby/nos2x)** | Orta | Yalnızca Masaüstü | Eklenti destekleyen masaüstü tarayıcılarla sınırlı |
| **NIP-46 Self-Hosted Bunker** | Maksimum (Sıfır Güven) | Tüm Cihazlar & Mobil | Anahtar izole sunucuda kilitlidir; web'e asla sızmaz |

---

## 3. Çözüm: NIP-46 Uzaktan İmzalama (Bunker Mimarisi)

**NIP-46 (Nostr Connect)**, sıfır güven (zero-trust) kriptografik bir sınır oluşturarak güvenlik modelini yeniden tanımlar.

Özel anahtarınızı istemci uygulamalarına dağıtmak yerine `nsec` anahtarınız yalnızca izole edilmiş uzaktan bir sunucu servisinde—yani **Bunker**'da kilitli kalır.

### NIP-46 Protokolünün Çalışma Mantığı

1. **Bağlantı Kurma**: İstemci `bunker://<pubkey>?relay=...&secret=...` bağlantı dizesi ile bunker ile şifreli bir oturum başlatır.
2. **RPC Talebi**: Bir not paylaşmak istediğinizde istemci standart Nostr röleleri üzerinden şifreli bir `sign_event` RPC isteği gönderir.
3. **İzin ve Politika Kontrolü**: Bunker istemcinin yetkilerini (izin verilen türler, hız kotaları, token süresi) denetler.
4. **İzole İmzalama**: Bunker olayı dahili `nsec` ile imzalar ve yalnızca geçerli Schnorr imzasını istemciye döndürür.
5. **Sıfır Sızıntı**: İstemci uygulaması özel anahtarınızı *asla* görmez ve tutmaz.

---

## 4. Politika Motoru ve Erişim Denetimi Mimarisi

Bilo Bunker, kimliğinizi korumak için sıkı bir kriptografik bekçi görevi görür:

- **Ayrıntılı Metot Beyaz Listesi**: İstemci uygulamalarına yalnızca ihtiyaç duydukları RPC metotları için izin verin (örneğin `sign_event` izni verip `nip04_decrypt` veya `get_public_key` çağrılarını engelleyin).
- **Olay Türü (Kind) Kısıtlamaları**: Belirli istemcileri sadece ilgili olay türleriyle sınırlandırın (örneğin bir mikroblog istemcisine yalnızca Kind 1 kısa not imzalama izni verip Kind 0 profil meta verisi veya Kind 4 direkt mesaj imzalamasını engelleyin).
- **Zaman Ayarlı Geçici Token'lar**: Yeni cihazlar, geçici bilgisayarlar veya test ortamları için otomatik süre sonlu erişim token'ları oluşturun.
- **Gerçek Zamanlı Denetim Kaydı (Audit Log)**: Gelen tüm RPC isteklerini, zaman damgalarını, istemci genel anahtarlarını ve imzalama durumunu doğrudan web panelinden izleyin.
- **Anında Yetki İptali**: Herhangi bir istemcinin erişimini tek tıkla iptal edin; ana anahtarınızı değiştirmek zorunda kalmadan imzalama yetkisini sonlandırın.

---

## 5. Bilo Bunker Neden Doğdu?

NIP-46 bu kadar güçlüyse neden herkes kullanmıyor?

Yakın zamana kadar kendi NIP-46 bunker'ınızı kurmak gereksiz yere zordu. Kullanıcılar iki kötü seçenekle karşı karşıyaydı:
1. **Merkezi Üçüncü Taraf İmzalatıcılar**: Başkalarının işlettiği sunucularda bunker açmak. Bu durum egemen kimlik fikrini tamamen yok eden bir emanetçi (custodial) tuzağıdır.
2. **Zorlu DevOps Süreçleri**: Var olan betikler karmaşıktı; çoklu kullanıcı desteği, otomatik TLS sertifikası ve canlı denetim paneli sunmuyordu.

### 🎭 Kültürel İlham: Neden "Bilo Bunker"?

1980 yapımı efsanevi Türk sineması klasiği ***Banker Bilo***'da (yönetmen: Ertem Eğilmez, başroller: İlyas Salman ve Şener Şen), kurnaz Maho saf köylüleri Almanya'ya götürme vaadiyle kandırıp paralarını alır ve İstanbul'da bir inşaat arsasına *"Burası Münih!"* diyerek bırakır.

Merkeziyetsiz ekosistemde anahtar yönetimini üçüncü taraflara emanet etmek, modern dünyada **Maho**'ya güvenmeye benzer. Kolaylık vaat ederler ama dijital varlığınızın kontrolünü ellerinde tutarlar.

Bilo bu acı dersten sonra kendi kaderini eline alıp **Banker Bilo** olarak finansal egemenliğini kurmuştur.

**Bilo Bunker** ile kendi imzalama altyapınıza sahip olur, kimseye bağımlı kalmaz ve asla şunu sormak zorunda kalmazsınız:
> *"Yaptım ama bir sor niye yaptım?"*

---

## 6. Mimari ve Teknik Altyapı

[**Bilo Bunker**](https://github.com/workouse/bilo-bunker), sıfırdan kurumsal seviyede, durum bilgisi tutan (stateful) ve çok kiracılı bir Nostr uzaktan imzalama platformu olarak geliştirildi.

```text
bilo-bunker/
├── .github/              # CI/CD iş akışları (Vitest, GHCR Docker yayınlama)
├── Caddyfile             # Otomatik TLS Ters Proxy (Let's Encrypt / ZeroSSL)
├── Dockerfile            # Çok aşamalı üretim imajı
├── docker-compose.yml    # Üretim konteyner orkestrasyonu
├── Makefile              # Geliştirici kısayolları (dev, test, deploy)
├── packages/
│   ├── app/              # Hono + Node.js arka uç motoru (NIP-46 RPC, SQLite)
│   └── ui/               # TailAdmin React SPA paneli (NIP-07 giriş, canlı loglar)
└── scripts/              # Tek komutla otomatik kurulum betikleri
```

### Temel Bileşenler

#### 1. Arka Uç Uygulama Motoru (`packages/app`)
- **Node.js** ve **Hono** framework'ü ile yüksek verimli ve düşük gecikmeli çalışma.
- Kriptografik doğrulama ve Schnorr imzaları için doğrudan `nostr-tools` entegrasyonu.
- **Çok Kiracılı SQLite Kalıcılığı (`better-sqlite3`)**: Şifrelenmiş anahtar kasaları, istemci yetkileri ve denetim loglarını ACID garantisiyle saklar.

#### 2. Otomatik SSL Ters Proxy (Caddy 2)
- `docker-compose.yml` içinde entegredir.
- Let's Encrypt / ZeroSSL üzerinden 80 ve 443 portlarında HTTPS sertifikalarını sıfır manuel müdahaleyle yeniler.

#### 3. Yönetim Paneli (`packages/ui`)
- **React** ve **TailAdmin** ile geliştirilmiş modern tek sayfa uygulaması (SPA).
- **NIP-07 ile Giriş**: Şifre yazmadan tarayıcı eklentinizle doğrudan yönetim paneline güvenli giriş.
- **Bağlantı URL'i ve QR Üretici**: Özelleştirilebilir gizli tokenlar ve röle seçenekleriyle tek tıkla `bunker://` bağlantısı oluşturma.
- **Canlı RPC Denetim Akışı**: Gelen tüm imza isteklerini ve yürütme detaylarını anlık olarak gösteren WebSocket akışı.

---

## 7. Hızlı Başlangıç: 2 Dakikada Bilo Bunker Kurulumu

Bilo Bunker her türlü Linux VPS sunucusunda (Ubuntu, Debian, Fedora, Arch) anında çalışacak şekilde tasarlandı.

### Seçenek A: Tek Komutla Otomatik Kurulum

Sunucunuzda tek satırlık kurulum betiğini çalıştırın:

```bash
curl -fsSL https://raw.githubusercontent.com/workouse/bilo-bunker/main/scripts/install.sh | bash
```

Sihirbaz şu adımları tamamlar:
1. Docker ve Docker Compose bağımlılıklarını denetler.
2. Alan adınızı (örn. `bunker.alanadiniz.com`) ve yönetici açık anahtarınızı (`npub`/pubkey) alır.
3. Ortam değişkenlerini hazırlar ve SQLite veritabanını başlatır.
4. Caddy otomatik SSL ve Node.js motorunu ayağa kaldırır.

### Seçenek B: Manuel Docker Compose Kurulumu

```bash
# 1. Depoyu klonlayın
git clone https://github.com/workouse/bilo-bunker.git
cd bilo-bunker

# 2. Ortamı hazırlayın
cp .env.dist .env

# .env dosyasını açıp DOMAIN ve OWNER_PUBKEY değerlerini girin
nano .env

# 3. Yığını başlatın
docker compose up -d
```

---

## 8. Nostr İstemcilerinizi Bağlayın

Bilo Bunker sunucunuz çalıştıktan sonra:

1. `https://bunker.alanadiniz.com` adresinden paneli açın ve NIP-07 ile giriş yapın.
2. **Create Connection URI** butonuna tıklayıp uygulama adını girin (örn. *Damus Mobil* veya *Coracle Web*).
3. Üretilen `bunker://` bağlantı dizesini kopyalayın veya QR kodu taratın:
   ```text
   bunker://<bunker_pubkey>?relay=wss://relay.damus.io&secret=3f8a9e...
   ```
4. Nostr istemcinizde **Log in with Nostr Connect / Bunker** seçeneğini seçip bağlantı dizesini yapıştırın.
5. İstemciniz şifreli röleler üzerinden anında bağlanır ve özel anahtarınız sunucunuzda %100 güvende kalır.

---

## Sonuç ve Gelecek Adımlar

Gerçek merkeziyetsizlik sadece bağımsız protokollere değil, aynı zamanda **egemen kullanıcı araçlarına** ihtiyaç duyar. Ham özel anahtar paylaşımını bırakıp NIP-46 uzaktan imzalamaya geçerek Nostr ekosistemindeki en kritik güvenlik açığını ortadan kaldırabilirsiniz.

- ⭐️ **GitHub'da İnceleyin ve Yıldızlayın**: [workouse/bilo-bunker](https://github.com/workouse/bilo-bunker)
- 📖 **Katkı Rehberi**: [Monorepo mimarisini](https://github.com/workouse/bilo-bunker/blob/master/CONTRIBUTING.md) inceleyerek açık kaynak geliştirmeye katılın.

---

## Özel Merkeziyetsiz Altyapıya mı İhtiyacınız Var?

**[Workouse](https://workouse.com)** olarak kurucular ve büyüyen şirketler için güvenilir, yüksek performanslı web sistemleri, açık protokoller ve özel entegrasyonlar geliştiriyoruz.

Projenizi hayata geçirmek için **[mühendislik ekibimizle iletişime geçin](https://workouse.com)**.
