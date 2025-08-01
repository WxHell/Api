const express = require('express');
const router = express.Router();

const Plants = require('../models/Plants');
const Category = require('../models/Category');
const upload = require('../config/multer');
const queryBuilder = require('../utils/queryBuilder');
const fs = require('fs');
const path = require('path');

// Helper fonksiyon: Verilen kategori ve tüm alt kategorilerinin ID'lerini bulur (recursive)
// Böylece parent-child ilişkili kategorilerde filtreleme yapabiliriz
// Örnek kullanımlar:
// GET /api/plants?sort=name                    - İsme göre A-Z sırala
// GET /api/plants?sort=-createdAt              - En yeni önce
// GET /api/plants?filter[status]=active        - Sadece aktif bitkiler
// GET /api/plants?filter[name]=gül,papatya    - İsmi gül veya papatya olanlar
// GET /api/plants?search=yeşil                 - Tüm alanlarda 'yeşil' ara
// GET /api/plants?page=2&limit=5              - 2. sayfa, 5 kayıt
// GET /api/plants?date_from=2024-01-01        - Belirli tarihten sonra

// 1. READ - Tüm bitkileri getir, gelişmiş filtreleme ve kategori + alt kategori desteği ile
router.get('/', async (req, res) => {
  
  async function getChildCategories(categoryId) {
  const children = await Category.find({ parent: categoryId }).select('_id');
  let allChildIds = children.map(child => child._id);

  for (const child of children) {
    const grandChildrenIds = await getChildCategories(child._id);
    allChildIds = allChildIds.concat(grandChildrenIds);
  }
  return allChildIds;
}
  try {
    // const filter = req.query.filter || {};

    // if (req.query.category) {
    //   const categoryDoc = await Category.findOne({ name: req.query.category.name, status: 'active' });
    //   if (categoryDoc) {
    //     filter.categoryId = categoryDoc._id;
    //   } else {
    //     return res.json({
    //       success: true,
    //       data: categoryId,
    //       total: 0,
    //       page: 1,
    //       limit: 0,
    //     });
    //   }
    
    

    // filtreyi doğrudan req.query.filter olarak ayarla
    // req.query.filter = filter;

    // Burada kesinlikle req nesnesini bozma, direkt ver:
    
    const result = await queryBuilder(Plants, req, {
      defaultLimit: 3,
      maxLimit: 50,
      defaultSort: 'createdAt',
      allowedSortFields: ['name', 'status', 'createdAt', 'updatedAt'],
      allowedFilterFields: ['name', 'description', 'status'],
      searchFields: ['name', 'description'],
      dateField: 'createdAt',
    });

    // Sonuçları imageUrl ile zenginleştir
    const dataWithImageUrls = result.data.map(plant => ({
      ...plant.toObject(),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`,
    }));

    res.json({
      ...result,
      data: dataWithImageUrls,
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 2. READ - Tek bitki getir (ID ile)
router.get('/:id', async (req, res) => {
  try {
    // ID ile bitkiyi bul, categoryId alanını populate et
    const plant = await Plants.findById(req.params.id).populate('categoryId');
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Bitki bulunamadı'
      });
    }
    // Bitkiyi image URL ile birlikte döndür
    res.json({
      success: true,
      data: {
        ...plant.toObject(),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
      }
    });
  } catch (error) {
    // Hata varsa 500 döndür
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 3. CREATE - Yeni bitki ekle
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Dosya yoksa hata döndür
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Bitki resmi yüklenmesi zorunludur'
      });
    }

    // Yeni bitki verisini oluşturuyoruz
    const plantData = {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || 'active',
      image: req.file.filename,
      categoryId: req.body.categoryId
    };

    // Yeni bitkiyi kaydet
    const plant = new Plants(plantData);
    await plant.save();

    // Başarılı yanıt
    res.status(201).json({
      success: true,
      message: 'Bitki başarıyla oluşturuldu',
      data: {
        ...plant.toObject(),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
      }
    });
  } catch (error) {
    // Dosya yüklenmişse ve hata varsa dosyayı sil
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Dosya silme hatası:', err);
      });
    }
    // Hata mesajını dön
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});


router.put('/assign-category',async (req,res) =>{
  const {plantId,categoryId} = req.body;
  try{
    const result =await Plants.updateMany(  
      {_id:{$in: plantId}},
      {$addToSet:{categoryId:categoryId}}
    );


    res.json({
      success:true,
      message: `${result.modifiedCount} bitki kategoriye atandı`
    });
  }catch(error){
    res.status(500).json({
      success:false,
      message:'Kategori atama işlemi sırasında hata',
      error:error.message,
    });
  }
});



// 4. UPDATE - Bitki güncelle
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    // Güncellenecek bitkiyi bul
    const existingPlant = await Plants.findById(req.params.id);
    if (!existingPlant) {
      return res.status(404).json({
        success: false,
        message: 'Bitki bulunamadı'
      });
    }

    // Güncellenecek verileri hazırla
    const updateData = {
      name: req.body.name || existingPlant.name,
      description: req.body.description || existingPlant.description,
      status: req.body.status || existingPlant.status
    };

    // Yeni resim yüklenmişse eskiyi sil ve yenisini kaydet
    if (req.file) {
      const oldImagePath = path.join('public/images', existingPlant.image);
      fs.unlink(oldImagePath, err => {
        if (err) console.error('Eski dosya silme hatası:', err);
      });
      updateData.image = req.file.filename;
    } else {
      updateData.image = existingPlant.image;
    }

    // Güncelle ve sonucu al
    const plant = await Plants.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    // Yanıtı dön
    res.json({
      success: true,
      message: 'Bitki güncellendi',
      data: {
        ...plant.toObject(),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
      }
    });
  } catch (error) {
    // Eğer yeni dosya yüklenmişse ve hata varsa onu sil
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Dosya silme hatası:', err);
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// 5. DELETE - Bitki sil
router.delete('/:id', async (req, res) => {
  try {
    // Silinecek bitkiyi bul
    const plant = await Plants.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Bitki bulunamadı'
      });
    }

    // Bitkiyi veritabanından sil
    await Plants.findByIdAndDelete(req.params.id);

    // Resim dosyasını da sil
    const imagePath = path.join('public/images', plant.image);
    fs.unlink(imagePath, err => {
      if (err) console.error('Resim dosyası silme hatası:', err);
    });

    // Başarılı yanıt
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
