import { Product } from '../models/product';
import { Category } from '../models/category';
import mongoose from 'mongoose';

export const getAllProducts = async (filter) => {
    const productList = await Product.find(filter).populate('category');
    return productList;
}

export const getProductById = async (id) => {
    const product = await Product.findById(id).populate('category');
    return product;
}

export const createProduct = async (data, file) => {
    const category = await Category.findById(data.category);
    if (!category) throw new Error('Invalid Category');

    if (!file) throw new Error('No image in the request');

    const fileName = file.filename;
    const basePath = `${data.protocol}://${data.host}/public/uploads/`;
    let product = new Product({
        name: data.name,
        description: data.description,
        image: `${basePath}${fileName}`,
        price: data.price,
        category: data.category,
        countInStock: data.countInStock,
        rating: data.rating,
        numReviews: data.numReviews,
        isFeatured: data.isFeatured,
    });

    product = await product.save();
    return product;
}

export const updateProduct = async (id, data) => {
    if (!mongoose.isValidObjectId(id)) throw new Error('Invalid Product Id');

    const category = await Category.findById(data.category);
    if (!category) throw new Error('Invalid Category');

    const product = await Product.findByIdAndUpdate(
        id,
        {
            name: data.name,
            description: data.description,
            richDescription: data.richDescription,
            image: data.image,
            brand: data.brand,
            price: data.price,
            category: data.category,
            countInStock: data.countInStock,
            rating: data.rating,
            numReviews: data.numReviews,
            isFeatured: data.isFeatured,
        },
        { new: true }
    );

    return product;
}

export const deleteProduct = async (id) => {
    const product = await Product.findByIdAndRemove(id);
    return product;
}

export const getProductCount = async () => {
    const productCount = await Product.countDocuments();
    return productCount;
}

export const getFeaturedProducts = async (count) => {
    const products = await Product.find({ isFeatured: true }).limit(+count);
    return products;
}

export const updateProductGallery = async (id, files, protocol, host) => {
    if (!mongoose.isValidObjectId(id)) throw new Error('Invalid Product Id');

    let imagesPaths = [];
    const basePath = `${protocol}://${host}/public/uploads/`;

    if (files) {
        files.map(file => {
            imagesPaths.push(`${basePath}${file.filename}`);
        });
    }

    const product = await Product.findByIdAndUpdate(
        id,
        { images: imagesPaths },
        { new: true }
    );

    return product;
}
