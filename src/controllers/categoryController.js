import * as categoryService from '../services/categoryService.js';

export const createCategory = async (req, res) => {
  try {
    const { category } = req.body;
    await categoryService.createCategory(category);
    res.status(201).send({
      success: true,
      message: `${category} category created successfully`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Create Cat API",
    });
  }
};

export const getAllCategoriesController = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.status(200).send({
      success: true,
      message: "Categories Fetch Successfully",
      totalCat: categories.length,
      categories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get All Cat API",
    });
  }
};

export const deleteCategoryController = async (req, res) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.status(200).send({
      success: true,
      message: "Category Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In DELETE CAT API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const updateCategoryController = async (req, res) => {
  try {
    const { updatedCategory } = req.body;
    await categoryService.updateCategory(req.params.id, updatedCategory);
    res.status(200).send({
      success: true,
      message: "Category Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In UPDATE CATEGORY API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};
