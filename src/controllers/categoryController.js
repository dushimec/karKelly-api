import * as categoryService from '../services/categoryService';

export const getAllCategories = async (req, res) => {
    try {
        const categoryList = await categoryService.getAllCategories();
        if (!categoryList) {
            return res.status(500).json({ success: false });
        }
        res.status(200).send(categoryList);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) {
            return res.status(500).json({ message: 'The category with the given ID was not found.' });
        }
        res.status(200).send(category);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        if (!category) {
            return res.status(400).send('The category cannot be created!');
        }
        res.send(category);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const updateCategory = async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        if (!category) {
            return res.status(400).send('The category cannot be updated!');
        }
        res.send(category);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const category = await categoryService.deleteCategory(req.params.id);
        if (category) {
            return res.status(200).json({ success: true, message: 'The category is deleted!' });
        } else {
            return res.status(404).json({ success: false, message: "Category not found!" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error });
    }
}
