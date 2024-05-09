import { Router } from "express";
import fs from 'fs';
import Product from '../models/product.model.js';
import { paginate } from "mongoose-paginate-v2";
import { createProductController, readProductController, readAllProductsController, updateProductController, deleteProductController } from "../controllers/product.controller.js";

const router = Router();

const filePathProducts = './src/productos.json';

// devuelve todos los productos
router.get('/', readAllProductsController); 

// devuelve un producto
router.get('/:pid', readProductController); 

// crea un producto
router.post('/', createProductController); 

 // actualiza un producto
router.put('/:pid', updateProductController);

 // elimina un producto
router.delete('/:pid', deleteProductController);

export default router; 