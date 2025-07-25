// Express.js framework'ünü import ediyoruz
// Express: Node.js için minimalist ve esnek web uygulama framework'ü
// HTTP server oluşturma, routing, middleware gibi özellikler sağlar
const express = require('express');

// dotenv kütüphanesini yüklüyor ve konfigüre ediyoruz
// dotenv: .env dosyasındaki environment variable'ları process.env'e yükler
// Bu sayede PORT, MONGODB_URI gibi değişkenleri kullanabiliriz
require('dotenv').config();

// Database bağlantı modülünü import ediyoruz
// Separation of concerns: Database logic'i ayrı dosyada tutuluyor
const connectDB = require('./config/database');

// Route modüllerini import ediyoruz
// Merkezi route yönetimi: Tüm endpoint'ler routes/index.js'de organize ediliyor
const routes = require('./routes');

// Express application instance'ı oluşturuyoruz
// app: Express uygulamasının ana objesi
// Tüm middleware'ler, route'lar ve konfigürasyonlar bu obje üzerinden yapılır
const app = express();

// Sunucu port'unu environment variable'dan alıyoruz
// process.env.PORT: .env dosyasındaki PORT değişkeni
// Heroku, Railway gibi deployment platformlar otomatik port atar
const PORT = process.env.PORT;

// Database bağlantısını başlatıyoruz
// connectDB(): Async fonksiyon - MongoDB'ye bağlantı kurar
// Uygulama başlarken ilk önce database bağlantısı kurulmalı
connectDB();

// Upload dizinlerini kontrol et ve oluştur
// fs modülünü require ediyoruz
const fs = require('fs');

// Gerekli dizinleri tanımlıyoruz
const uploadDirectories = ['public', 'public/images'];

// Her dizini kontrol et ve yoksa oluştur
uploadDirectories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dizin oluşturuldu: ${dir}`);
    }
});

// ===== MIDDLEWARE TANIMLARI =====
// Middleware: Request-Response cycle'ında ara işlemler yapan fonksiyonlar
// Sıralı olarak çalışırlar ve next() ile bir sonrakine geçerler

// JSON Middleware
// express.json(): Gelen HTTP request'lerin body'sini JSON olarak parse eder
// req.body'yi kullanabilmek için gerekli
// Content-Type: application/json olan request'ler için çalışır
app.use(express.json());

// Static Files Middleware
// express.static(): public dizinindeki dosyaları statik olarak serve eder
// Böylece upload edilen resimler http://localhost:PORT/images/filename.jpg ile erişilebilir
app.use(express.static('public'));

// ===== ROUTE TANIMLARI =====
// Route Mounting: Alt route'ları ana uygulamaya bağlama işlemi

// '/api' prefix'i ile routes modülünü mount ediyoruz
// app.use(path, router): Belirtilen path'de router'ı aktif eder
// Böylece /api/users, /api/plants gibi endpoint'ler çalışır
app.use('/api', routes);

// ===== SUNUCU BAŞLATMA =====
// HTTP sunucusunu başlatıyoruz

// app.listen(): Express uygulamasını belirtilen port'ta dinlemeye başlar
// PORT: Sunucunun dinleyeceği port numarası
// Callback function: Sunucu başarıyla başladığında çalışır
app.listen(PORT, () => {
    // Console log: Sunucu başlatıldığında bilgi mesajı
    // Template literal: ${} ile değişken interpolation
    console.log(`🚀 Sunucu ${PORT} portunda başlatıldı`);
    console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📚 Stajyer Notu: Postman ile test edebilirsin!`);
}); 