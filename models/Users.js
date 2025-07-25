// Mongoose kütüphanesini import ediyoruz
// Mongoose: MongoDB ile Node.js arasında bir köprü görevi gören ODM (Object Document Mapper)
const mongoose = require('mongoose');

// Schema (Şema): Veri yapısının tanımlandığı blueprint/şablon
// MongoDB collection'ındaki document'lerin hangi field'lara sahip olacağını belirler
const userSchema = new mongoose.Schema({
    // firstName field'ı
    firstName: {
        type: String,        // Veri tipi: String (metin)
        required: true       // Zorunlu alan: Bu field olmadan kayıt yapılamaz
    },
    
    // lastName field'ı
    lastName: {
        type: String,        // Veri tipi: String
        required: true       // Zorunlu alan
    },
    
    // phone field'ı
    phone: {
        type: String,        // Telefon numarası String olarak saklanır
        required: true       // Zorunlu alan
    },
    
    // email field'ı
    email: {
        type: String,        // Email String olarak saklanır
        required: true,      // Zorunlu alan
        unique: true         // Benzersiz olmalı: Aynı email ile 2 kullanıcı olamaz
    },
    
    // status field'ı - Kullanıcının aktif/pasif durumu
    status: {
        type: String,                    // Veri tipi: String
        enum: ['active', 'inactive'],    // Enum: Sadece bu değerler kabul edilir
        default: 'active'                // Varsayılan değer: Yeni kullanıcılar aktif olur
    }
}, {
    // Schema seçenekleri
    timestamps: true    // createdAt ve updatedAt field'larını otomatik ekler
    // createdAt: Kayıt oluşturulma tarihi
    // updatedAt: Son güncelleme tarihi
});

// Model oluşturma ve export etme
// mongoose.model('ModelAdı', schema) şeklinde kullanılır
// 'User' -> MongoDB'de 'users' collection'ı oluşturur (küçük harf + çoğul)
module.exports = mongoose.model('User', userSchema); 