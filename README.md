# 📄 DocuScan - Akıllı Belge Tarayıcı & SaaS Platformu

DocuScan; fiziksel belgeleri, makbuzları ve evrakları stüdyo kalitesinde dijitalleştiren, eğrilikleri ve bükülmeleri 3 boyutlu olarak düzelten modern bir belge tarama ve SaaS çözümüdür.

---

## ✨ Özellikler

- 📐 **Akıllı Köşe Tespiti & Perspektif Düzeltme:** 4 noktalı homografi ve A4 oran koruma.
- 🌊 **3D Bükülme & Kıvrım Düzeltici (Coons Patch):** Arşivlenmiş veya kıvrılmış belgeleri mükemmel düzlem haline getirme.
- 🎨 **CamScanner Kalitesinde "Sihirli Renk" (Magic Color):** Gölgeleri yok eden, arka plan aydınlatmasını eşitleyen stüdyo kalitesinde filtreleme.
- 📑 **Çok Sayfalı Belge & A4 PDF / ZIP İndirme:** Sayfa sıralama, döndürme ve tek tıkla yüksek çözünürlüklü çıktı.
- 🎁 **İlk 1 Hafta Ücretsiz Deneme:** Her yeni üyeye otomatik 7 gün sınırsız PRO deneme süresi.
- 🎟️ **Tek Kullanımlık Kupon Kodu Motoru:** Sadece 1 kullanıcı tarafından 1 kez kullanılabilen garantili lisanslama.
- 👑 **Gelişmiş Yönetim Paneli (Admin):** Kupon üretimi, fiyatlandırma paketleri ve kullanıcı deneme takibi.
- 📱 **Çok Platformlu (Cross-Platform):** Web (Vercel), Android (Google Play) ve iOS (Apple App Store).

---

## 🚀 Kurulum & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Canlı derleme (Production Build)
npm run build
```

---

## 🌐 Dağıtım (Vercel)

Proje Vercel ile %100 uyumludur. SPA yönlendirmeleri `vercel.json` içerisinde yapılandırılmıştır.

---

## 📱 Mobil Platformlar (Capacitor)

```bash
# Değişiklikleri mobil projelere aktarın
npm run build
npx cap sync

# Android Studio ile açın (Google Play için)
npx cap open android

# Xcode ile açın (App Store için)
npx cap open ios
```
