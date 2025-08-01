const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const upload = require("../config/multer");
const queryBuilder = require("../utils/queryBuilder");
const fs = require("fs");
const path = require("path");
const Plants = require("../models/Plants");

// En çok bitkisi olan kategorileri getir
router.get("/most-plants", async (req, res) => {
  try {
    let limit = parseInt(req.query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      limit = 5;
    }

    const result = await Plants.aggregate([
      { $unwind: "$categoryId" }, // Dizi içindeki her categoryId için ayrı belge oluşturur

      {
        $group: {
          _id: "$categoryId", //Her kategoriye göre grupla
          plantCount: { $sum: 1 }, //Her bir kategori için bitki sayısını hesapla
        },
      },

      { $sort: { plantCount: -1 } }, //En çok bitkiden en aza sırala

      { $limit: limit }, //Sadece en çok bitkili N kategori

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },

      { $unwind: "$category" }, //Tek kategori objesine dönüştür

      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          name: "$category.name",
          plantCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/categories/tree",async (req,res)=>{
try{
  const rootName = req.query.root
  if(!rootName){
    return res.status(400).json({success:false,message:"root parametresi bulunamadı"});
  }

  let current = await Category.findOne({name:rootName});
  if(!current){
    return res.status(404).json({success:false,message:"Kategori bulunamadı"});
  }

  const chain = [current.name];
  
  while(true){
    const next = await Category.findOne({parent:current._id});
    if(!next)break;
    chain.push(next.name);
    current = next;
  
  }
  return res.json({success:true,data:chain});
  
}catch(error){
  res.status(500).json({success:false,message:error.message});
}
});




router.get("/categories", async (req, res) => {
  try {
    const filter = {};

    if (req.query.parent) {
      const parentCategory = await Category.findOne({ name: req.query.parent });
      if (parentCategory) {
        filter.parent = parentCategory._id;
      } else {
        return res.json({ success: true, message: "Bulunamadı", data:parentCategory});
      }
    }

    // query'ye filter'ı düzgün şekilde ekle
    req.query.filter = {
      ...(req.query.filter || {}),
      ...filter
    };

    // HATASIZ: req nesnesi doğrudan gönderiliyor
    const result = await queryBuilder(Category, req, {
      defaultLimit: 10,
      maxLimit: 50,
      defaultSort: 'createdAt',
      allowedSortFields: ['name', 'createdAt', 'updatedAt'],
      allowedFilterFields: ['name', 'status', 'parent'],
      searchFields: ['name', 'description'],
      dateField: 'createdAt'
    });

    const dataWithImageUrls = result.data.map(category => ({
      ...category.toObject ? category.toObject() : category,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${category.icon}`
    }));

    res.json({
      ...result,
      data: dataWithImageUrls,
      success: true
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if(req.query.category){
      const category = await Category.findOne({name:req.query.category});
      if(!category){
        return res.status(404).json({
          success:false,
          message:"Kategori bulunamadı",
        });
      }

      filter.categoryId=category._id;
    }
  
  
    const result = await queryBuilder(Category, req, {
      defaultLimit: 5,
      maxLimit: 40,
      defaultSort: "createdAt",
      allowedSortFields: ["name", "createdAt", "updatedAt"],
      allowedFilterFields: ["name", "status", "description"],
      searchFields: ["name", "description"],
      dateField: "createdAt",
    });

    const iconImageUrls = result.data.map((category) => ({
      ...category.toObject(),
      imageUrl: `${req.protocol}://${req.get("host")}/images/${category.icon}`,
    }));

    res.json({
      ...result,
      data: iconImageUrls,
      satisfies: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id/plants", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const plant = await Plants.find({ categoryId: { $in: [categoryId] } });

    res.json({
      success: true,
      data: plant,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı",
      });
    }
    res.json({
      success: true,
      data: {
        ...category.toObject(),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          category.icon
        }`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

//POST:Yeni kategori eklemek için
router.post("/", upload.single("icon"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Kategori iconu eklemek zorunludur!",
      });
    }

    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "active",
      icon: req.file.filename,
      parent:req.body.parent || null,
    };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: "Kategori başarıyla eklendi",
      data: {
        ...category.toObject(),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          category.icon
        }`,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Dosya silinirken hata oluştu:", err);
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

//PUT:Kategorisi güncellemek için
router.put("/:id", upload.single("icon"), async (req, res) => {
  try {
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı",
      });
    }

    const updateData = {
      name: req.body.name || existingCategory.name,
      description: req.body.description || existingCategory.description,
      status: req.body.status || existingCategory.status,
    };

    if (req.file) {
      const oldIconPath = path.join("public/images", existingCategory.icon);
      fs.unlink(oldIconPath, (error) => {
        if (error) {
          console.error("Eski ikon silinirken hata oluştu:", error);
        }
      });
      updateData.icon = req.file.filename;
    } else {
      updateData.icon = existingCategory.icon;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: "Kategori başarıyla güncellendi",
      data: {
        ...category.toObject(),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          category.icon
        }`,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (error) => {
        console.error("Dosya silme hatası oluştu:", error);
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

//DELETE: Kategori sil
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı",
      });
    }
    //categoryId bağlı bitkiyide siler
    await Plants.deleteMany({ categoryId: req.params.id });

    //stausunu değiştirmek için
    // await Plants.deleteMany({categoryId:categoryId},
    //     {$set:{status:'inActive'}}
    // )

    const iconPath = path.join("public/images", category.icon);
    fs.unlink(iconPath, (error) => {
      if (error) {
        console.error("İkon silinirken hata oluştu:", error);
      } else {
        console.log(`İkon başarıyla silindi: ${category.icon}`);
      }
    });

    res.json({
      success: true,
      message: "Kategori başarıyla silindi",
      deletedData: {
        id: category._id,
        name: category.name,
        deletedImage: category.icon,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
