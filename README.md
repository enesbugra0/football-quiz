# ⚽ Futbol Kesişim - Multiplayer Bilgi Yarışması

Bu proje, oyuncuların takımların ortak futbolcularını bulmaya çalıştığı gerçek zamanlı (multiplayer) bir tahmin oyunudur.

## 🏗 Mimari Çözüm ve Vercel Uyumluluğu (ÖNEMLİ)

Vercel, "Serverless" (Sunucusuz) mimariye sahiptir. Bu mimaride fonksiyonlar maksimum 10-15 saniye yaşar ve ardından kapanır. Bu durum, uzun ömürlü ve sürekli bağlantı gerektiren **WebSocket (Socket.io)** yapısıyla uyumsuzdur. 

**Nasıl Çözdük?**
Bu sorunu aşmak için projeyi **"Frontend"** ve **"Backend"** olarak tamamen ikiye ayırdık:
1. **Frontend (Vite + React):** Vercel üzerinde hızlı ve ücretsiz şekilde host edilir.
2. **Backend (Node.js + Socket.io + SQLite):** WebSockets'i tam (native) destekleyen **Render.com** (veya Railway) gibi sunucu tabanlı platformlarda host edilir.

Bu sayede hem Vercel'in hızından faydalanıyoruz hem de Socket.io'nun gerçek zamanlı (ping-pong) bağlantısını kesintisiz kullanıyoruz.

---

## 🚀 Deployment (Canlıya Alma) Adımları

Projenizi internete açmak için aşağıdaki 2 aşamayı sırasıyla uygulayın.

### Aşama 1: Backend'i Canlıya Almak (Render.com)

1. Bir [Render.com](https://render.com) hesabı oluşturun.
2. Sağ üstten **New > Web Service** seçeneğine tıklayın.
3. Bu projenin yüklü olduğu GitHub reposunu seçin.
4. Ayarları şu şekilde yapın:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Ücretsiz planı (Free Tier) seçip **Create Web Service**'e tıklayın.
6. Deployment bittiğinde Render size bir URL verecektir (örn: `https://football-quiz-backend.onrender.com`). Bu URL'yi kopyalayın.

### Aşama 2: Frontend'i Canlıya Almak (Vercel)

1. Bir [Vercel](https://vercel.com) hesabı oluşturun ve GitHub reposunu bağlayın.
2. **Add New > Project** seçeneği ile projenizi seçin.
3. **Framework Preset** olarak `Vite` seçili geldiğinden emin olun.
4. **Root Directory** kısmını `frontend` olarak düzenleyin (Vercel'e "benim projem frontend klasörünün içinde" demiş oluyoruz).
5. **Environment Variables (Çevre Değişkenleri)** bölümüne şunu ekleyin:
   - `Name`: `VITE_BACKEND_URL`
   - `Value`: Aşama 1'de kopyaladığınız Render Backend URL'niz (örn: `https://football-quiz-backend.onrender.com`).
6. **Deploy** butonuna tıklayın.

Tebrikler! Oyununuz artık hem telefonda hem bilgisayarda oynanabilir halde canlıda!

---

## 💻 Yerel Geliştirme (Local Environment)

Bilgisayarınızda test etmek isterseniz:

**1. Backend'i Başlatın:**
```bash
cd backend
npm install
node server.js
```
*(Backend `http://localhost:3001` adresinde çalışacaktır.)*

**2. Frontend'i Başlatın:**
Yeni bir terminal sekmesi açıp:
```bash
cd frontend
npm install
npm run dev
```
*(Frontend genelde `http://localhost:5173` adresinde çalışacaktır.)*

## 🎙️ Sesli Girdi (Voice Recognition) Hakkında
Uygulama, Web Speech API kullanır. Tarayıcının mikrofon erişimine izin verilmesi zorunludur. Mikrofon simgesine tıkladığınızda konuşmanız anında metne dönüşür ve tahmininiz input kutusuna aktarılır.
