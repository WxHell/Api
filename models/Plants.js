// Mongoose kütüphanesini import ediyoruz
// MongoDB için Object Document Mapper (ODM) kütüphanesi
const mongoose = require('mongoose');

// Plant (Bitki) modeli için schema tanımı
// Bu schema bitki bilgilerini saklamak için kullanılacak
const plantSchema = new mongoose.Schema({
    // name field'ı - Bitki adı
    name: {
        type: String,        // Veri tipi: String (metin)
        required: true,      // Zorunlu alan: Bitki adı mutlaka girilmeli
        unique: true         // Benzersiz: Aynı isimde 2 bitki olamaz
    },
    
    // description field'ı - Bitki açıklaması
    description: {
        type: String,        // Bitki hakkında detaylı bilgi
        required: true       // Zorunlu alan: Açıklama mutlaka girilmeli
    },
    
    // image field'ı - Bitki resmi
    image: {
        type: String,        // Resim URL'si veya dosya yolu String olarak saklanır
        required: true       // Zorunlu alan: Her bitkinin resmi olmalı
    },
    
    // status field'ı - Bitkinin durumu (aktif/pasif)
    status: {
        type: String,                    // Veri tipi: String
        enum: ['active', 'inactive'],    // Enum validation: Sadece bu 2 değer kabul edilir
        default: 'active'                // Varsayılan değer: Yeni bitkiler aktif olur
    },categoryId:[{
        type:mongoose.Schema.Types.ObjectId, // categoryId field'ı - Bitkinin ait olduğu kategori
        ref:'Category', 
        required: true 
    }]
    
}, {
    // Schema configuration (yapılandırma) seçenekleri
    timestamps: true    // Otomatik zaman damgaları ekler:
    // - createdAt: Bitki kaydının oluşturulma tarihi
    // - updatedAt: Son güncelleme tarihi
    // Bu field'lar MongoDB tarafından otomatik yönetilir
});

// Model oluşturma ve dışa aktarma
// 'Plant' model adı -> MongoDB'de 'plants' collection'ı oluşur
// Mongoose otomatik olarak model ismini küçük harfe çevirir ve çoğul yapar
module.exports = mongoose.model('Plant', plantSchema); 