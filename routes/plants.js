// Express framework'ünü import ediyoruz
const express = require('express');

// Router instance oluşturuyoruz - modüler route yapısı için
const router = express.Router();

// Plant model'ini import ediyoruz - database işlemleri için
const Plants = require('../models/Plants');

// Multer konfigürasyonunu import ediyoruz - dosya upload için
const upload = require('../config/multer');

// Advanced Query Builder utility'sini import ediyoruz
// Sort, Filter, Pagination özellikleri için
const queryBuilder = require('../utils/queryBuilder');
const { populate } = require('../models/Category');
const Category = require('../models/Category');

// ===== PLANT CRUD İŞLEMLERİ (Create, Read, Update, Delete) =====

// 1. READ - Tüm bitkileri getir (GET /api/plants)
// HTTP GET method: Veri okuma işlemleri için kullanılır
// ADVANCED: Sort, Filter, Pagination desteği
// 
// Örnek kullanımlar:
// GET /api/plants?sort=name                    - İsme göre A-Z sırala
// GET /api/plants?sort=-createdAt              - En yeni önce
// GET /api/plants?filter[status]=active        - Sadece aktif bitkiler
// GET /api/plants?filter[name]=gül,papatya    - İsmi gül veya papatya olanlar
// GET /api/plants?search=yeşil                 - Tüm alanlarda 'yeşil' ara
// GET /api/plants?page=2&limit=5              - 2. sayfa, 5 kayıt
// GET /api/plants?date_from=2024-01-01        - Belirli tarihten sonra
router.get('/', async (req, res) => {
    try {
        // Advanced Query Builder kullanıyoruz
        // Professional response format ile
        const result = await queryBuilder(Plants, req, {
            // Query Builder konfigürasyonu
            defaultLimit: 3,           // Varsayılan sayfa boyutu
            maxLimit: 50,              // Maksimum sayfa boyutu
            defaultSort: 'createdAt',   // Varsayılan sıralama field'ı
            
            // Güvenlik: Hangi field'larda sıralama yapılabilir
            allowedSortFields: ['name', 'status', 'createdAt', 'updatedAt'],
            
            // Güvenlik: Hangi field'larda filtreleme yapılabilir
            allowedFilterFields: ['name', 'description', 'status'],
            
            // İsterseniz tüm field'lara izin vermek için: allowedFilterFields: []
            
            // Global search: Hangi field'larda arama yapılabilir
            searchFields: ['name','description'],
            
            // Date filtering için hangi field kullanılacak
            dateField: 'createdAt',
        });
        
        // Image URL'lerini data'ya ekliyoruz
        const dataWithImageUrls = result.data.map(plant => ({
            ...plant.toObject(),
            // Her bitki için tam image URL'ini ekliyoruz
            imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
        }));
        
        // Professional response format
        // data field'ını güncellenmiş verilerle değiştiriyoruz
        const response = {
            ...result,
            data: dataWithImageUrls,
            success: true
        };
        
        // HTTP 200 (OK) status code ile başarılı response
        res.json(response);
        
    } catch (error) {
        // Hata durumunda HTTP 500 (Internal Server Error)
        // try-catch: Hata yakalama ve yönetimi
        res.status(500).json({
            success: false,
            message: error.message  // Hata mesajı
        });
    }
});

router.get('/plants', async (req, res) => {
  try {
    // Eğer category parametresi varsa
    if (req.query.category) {
      // Category koleksiyonundan eşleşen kategoriyi bul
      const categoryDoc = await Category.findOne({ name: req.query.category });
      if (categoryDoc) {
        // Eğer filter objesi yoksa oluştur
        req.query.filter = req.query.filter || {};
        // categoryId ile filtreye kategori _id'sini ekle
        req.query.filter.categoryId = categoryDoc._id.toString();
      }
      // Category parametresi kullanıldıktan sonra temizlenebilir
      delete req.query.category;
    }

    // filter objesi varsa kullan, yoksa boş obje ile sorgula (tüm bitkiler)
    const filter = req.query.filter || {};

    // Filtreye göre Plants koleksiyonundan veriyi çek
    const plants = await Plants.find(filter);

    // JSON olarak başarıyla sonucu döndür
    res.json({
      success: true,
      data: plants
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 2. READ - Tek bitki getir (GET /api/plants/:id)
// URL Parameters: :id dinamik parametre (örn: /api/plants/123)
router.get('/:id', async (req, res) => {
    try {
        // req.params.id: URL'den gelen dinamik parametre
        // Plants.findById(): MongoDB'de ID'ye göre tek kayıt bulma
        const plant = await Plants.findById(req.params.id).populate('categoryId'); // categoryId ile Category modelini populate ediyoruz
        
        // Bitki bulunamadığında kontrol
        if (!plant) {
            // HTTP 404 (Not Found) - Kayıt bulunamadı
            return res.status(404).json({
                success: false,
                message: 'Bitki bulunamadı'
            });
        }
        
        // Başarılı durumda bitki verisini image URL'i ile birlikte döndür
        res.json({
            success: true,
            data: {
                ...plant.toObject(),
                // Tam image URL'ini ekliyoruz
                imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
            }
        });
    } catch (error) {
        // Geçersiz ID formatı vb. hatalar için
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});




// 3. CREATE - Yeni bitki oluştur (POST /api/plants)
// HTTP POST method: Yeni veri oluşturma işlemleri için kullanılır
// upload.single('image'): 'image' field'ından tek dosya upload'u kabul eder
router.post('/', upload.single('image'), async (req, res) => {
    try {
        // req.body: Form-data'dan gelen text field'lar (name, description, status)
        // req.file: Upload edilen dosya bilgileri (filename, path, size vb.)
        
        // Dosya upload kontrolü
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Bitki resmi yüklenmesi zorunludur'
            });
        }
        
        // Plant verisini hazırlıyoruz
        const plantData = {
            name: req.body.name,
            description: req.body.description,
            status: req.body.status || 'active',
            // Upload edilen dosyanın sadece filename'ini kaydediyoruz
            // Full path: public/images/filename.jpg
            // Database'de: filename.jpg (public/images prefix'i otomatik eklenir)
            image: req.file.filename,
            categoryId: req.body.categoryId // Kategori ID'si
        };
        
        // new Plants(): Yeni bitki instance'ı oluştur
        const plant = new Plants(plantData);
        
        // await plant.save(): Veritabanına kaydet
        // Mongoose validation'ları burada çalışır (required, unique vb.)
        await plant.save();
        
        // HTTP 201 (Created) - Başarılı oluşturma
        res.status(201).json({
            success: true,
            message: 'Bitki başarıyla oluşturuldu',
            data: {
                ...plant.toObject(),
                // Client için tam image URL'ini ekliyoruz
                imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
            }
        });
    } catch (error) {
        // Multer hatası durumunda dosyayı temizle
        if (req.file) {
            const fs = require('fs');
            const filePath = req.file.path;
            // Dosya sisteminden sil
            fs.unlink(filePath, (err) => {
                if (err) console.error('Dosya silme hatası:', err);
            });
        }
        
        // Validation hatası vb. için HTTP 400 (Bad Request)
        // Örn: name alanı boş, unique constraint ihlali, dosya tipi hatası
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 4. UPDATE - Bitki güncelle (PUT /api/plants/:id)
// HTTP PUT method: Mevcut veriyi güncelleme işlemleri için kullanılır
// upload.single('image'): 'image' field'ından tek dosya upload'u kabul eder (opsiyonel)
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        // Önce mevcut bitkiyi buluyoruz
        const existingPlant = await Plants.findById(req.params.id);
        if (!existingPlant) {
            return res.status(404).json({
                success: false,
                message: 'Bitki bulunamadı'
            });
        }
        
        // Güncelleme verisini hazırlıyoruz
        const updateData = {
            name: req.body.name || existingPlant.name,
            description: req.body.description || existingPlant.description,
            status: req.body.status || existingPlant.status
        };
        
        // Eğer yeni resim upload edildiyse
        if (req.file) {
            // Eski resmi siliyoruz (dosya sisteminden)
            const fs = require('fs');
            const path = require('path');
            const oldImagePath = path.join('public/images', existingPlant.image);
            
            fs.unlink(oldImagePath, (err) => {
                if (err) console.error('Eski dosya silme hatası:', err);
            });
            
            // Yeni resim filename'ini ekliyoruz
            updateData.image = req.file.filename;
        }
        // Eğer yeni resim upload edilmediyse, eski resmi koru
        else {
            updateData.image = existingPlant.image;
        }
        
        // Plants.findByIdAndUpdate(): ID'ye göre bul ve güncelle
        // Parametreler: (id, updateData, options)
        const plant = await Plants.findByIdAndUpdate(
            req.params.id,          // Güncellenecek kayıt ID'si
            updateData,             // Güncellenecek veri
            { 
                new: true,          // Güncellenmiş veriyi döndür (false: eski veri)
                runValidators: true // Mongoose validation'larını çalıştır
            }
        );
        
        // Başarılı güncelleme response'u
        res.json({
            success: true,
            message: 'Bitki güncellendi',
            data: {
                ...plant.toObject(),
                // Tam image URL'ini ekliyoruz
                imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
            }
        });
    } catch (error) {
        // Eğer güncelleme sırasında hata oldu ve yeni dosya upload edildiyse, onu sil
        if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Dosya silme hatası:', err);
            });
        }
        
        // Validation hatası için HTTP 400
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 5. DELETE - Bitki sil (DELETE /api/plants/:id)
// HTTP DELETE method: Veri silme işlemleri için kullanılır
router.delete('/:id', async (req, res) => {
    try {
        // Önce bitkiyi buluyoruz (resim dosyası bilgisi için)
        const plant = await Plants.findById(req.params.id);
        
        // Bitki bulunamadığında kontrol
        if (!plant) {
            return res.status(404).json({
                success: false,
                message: 'Bitki bulunamadı'
            });
        }
        
        // Database'den bitkiyi siliyoruz
        await Plants.findByIdAndDelete(req.params.id);
        
        // İlişkili resim dosyasını dosya sisteminden siliyoruz
        const fs = require('fs');
        const path = require('path');
        
        // Resim dosyasının tam yolu
        const imagePath = path.join('public/images', plant.image);
        
        // Dosyayı sil (async olarak)
        fs.unlink(imagePath, (err) => {
            if (err) {
                // Dosya bulunamasa bile hata verme (belki önceden silinmiş)
                console.error('Resim dosyası silme hatası:', err);
            } else {
                console.log(`✅ Resim dosyası silindi: ${plant.image}`);
            }
        });
        
        // Başarılı silme response'u
        // Silinen veriyi döndürmek yerine sadece mesaj gönderiyoruz
        res.json({
            success: true,
            message: 'Bitki ve ilişkili resim dosyası silindi',
            deletedData: {
                id: plant._id,
                name: plant.name,
                deletedImage: plant.image
            }
        });
    } catch (error) {
        // Silme işlemi hatası için HTTP 500
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Router'ı export ediyoruz
// Bu sayede routes/index.js'de import edilebilir
module.exports = router; 