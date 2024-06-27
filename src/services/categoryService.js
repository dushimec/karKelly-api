import { Category } from '../models/category';

export const getAllCategories = async () => {
    const categoryList = await Category.find();
    return categoryList;
}

export const getCategoryById = async (id) => {
    const category = await Category.findById(id);
    return category;
}

export const createCategory = async (data) => {
    let category = new Category({
        name: data.name,
    });
    category = await category.save();
    return category;
}

export const updateCategory = async (id, data) => {
    const category = await Category.findByIdAndUpdate(
        id,
        {
            name: data.name,
        },
        { new: true }
    );
    return category;
}

export const deleteCategory = async (id) => {
    const category = await Category.findByIdAndRemove(id);
    return category;
}
