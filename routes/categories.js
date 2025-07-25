const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const upload = require('../config/multer'); 
const queryBuilder = require('../utils/queryBuilder');

router.get('/', async (req, res) => {
    try {
        const result = await queryBuilder(Category, req, {
            defaultLimit: 5,
            maxLimit: 40,
            defaultSort: 'createdAt',
            allowedSortFields: ['categoryName', 'createdAt', 'updatedAt'],
            allowedFilterFields: ['categoryName', 'status', 'description'],
            searchFields: ['categoryName', 'description'],
            dateField: 'createdAt'
        });

        const iconImageUrls = result.data.map(category => ({
            ...category.toObject(),
            imageUrl: `${req.protocol}://${req.get('host')}/images/${category.icon}`
        }));

        const response = {
            ...result,
            data: iconImageUrls,
            satisfies: true
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/',upload.single('icon'),async (req,res) =>{
    try {
        if(!req.file){
            return res.status(400).json({
                success:false,
                message:'Kategori iconu eklemek zorunludur!'
            });
        }
        const categoryData = {
            categoryName:req.body.categoryName,
            description:req.body.description,
            status:req.body.status || 'active',
            icon: req.file.filename
        };
        const category = new Category(categoryData);
        await category.save();

        res.status(201).json({
            success:true,
            message:'Kategori başarıtla eklendi',
            data:{
                ...Category.toObject(),
                imageUrl:`${req.protocol}://${req.get('host')}/images/${category.icon}`
            }
        })
    }catch(error){
        if(req.file){
            const fs = require('fs');
            const filePath = req.file.path;
            fs.unlink(filePath,(err) =>{
                if(err)console.error('Dosya silinirken hata oluştu:', err);
            });
        }
        res.status(400).json({
            success:false,
            message:error.message
        });
    }

} 
);




module.exports = router;
