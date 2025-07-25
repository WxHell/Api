// Express framework'ünü import ediyoruz
const express = require('express');

// Router instance oluşturuyoruz
// express.Router(): Modüler route handler'lar oluşturmak için kullanılır
// Mini-application gibi davranır, middleware ve route'ları gruplar
const router = express.Router();

// Route modüllerini import ediyoruz
// Her resource (kullanıcı, bitki vb.) için ayrı route dosyaları
const userRoutes = require('./users');    // User CRUD işlemleri
const plantRoutes = require('./plants');  // Plant CRUD işlemleri
const categıoryRoutes = require('./categories'); // Category CRUD işlemleri
// Route tanımlamaları (Route Definitions)
// router.use(): Middleware ve sub-router'ları mount etmek için kullanılır
// '/users' path'i için userRoutes modülünü kullan
router.use('/users', userRoutes);   // /api/users/* endpoint'leri
router.use('/plants', plantRoutes); // /api/plants/* endpoint'leri
router.use('/categories', categıoryRoutes); // /api/category/* endpoint'leri
// API ana sayfası (Root endpoint)
// GET /api - API hakkında genel bilgi verir
router.get('/', (req, res) => {
    // JSON response döndürüyoruz
    // req: Request object (gelen istek bilgileri)
    // res: Response object (gönderilecek yanıt)
    res.json({
        success: true,                          // İşlem durumu
        message: 'Express API\'ye hoş geldiniz!', // Karşılama mesajı
        project: 'Plant API',                   // Proje adı
        version: '1.0.0',                      // API versiyonu
        
        // Mevcut endpoint'lerin listesi
        // Client'ların hangi endpoint'leri kullanabileceğini gösterir
        endpoints: {
            users: '/api/users',      // Kullanıcı işlemleri
            plants: '/api/plants',
            category:'/api/categories'    // Bitki işlemleri
        }
    });
});

// Router'ı dışa aktarıyoruz
// Bu sayede app.js'de bu router'ı kullanabiliriz
module.exports = router; 