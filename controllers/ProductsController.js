import HttpError from 'http-errors';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import Promise from 'bluebird';

import {
  Products, ProductAttributes, ProductImages, ProductRelations,
} from '../models';
import validate from '../services/validate';
import SliderImages from "../models/SliderImages";

class ProductsController {

  static list = async (req, res, next) => {
    try {
      await validate(req.query, {
        page: 'numeric',
        s: 'string',
      });

      let { query } = req;
      const { s, page = 1, max = 0, min = 0, ...a } = query

      let limit = 5;
      const offset = (page - 1) * limit;
      const where = {
        $and: []
      };

      if (s) {
        const search = s.trim().split(' ');

        search.forEach(str => {
          where.$and.push({
            $or: [
              { name: { $like: `%${str}%` } },
              { description: { $like: `%${str}%` } },
              { shortDescription: { $like: `%${str}%` } },
              { '$attribute.attributeValue$': { $like: `%${str}%` } },
              { '$attribute.attributeKey$': { $like: `%${str}%` } },
            ]
          });
        })
      }
      if (min || max) {
        where.$and.push({ price: { $gte: min } })
        where.$and.push({ price: { $lte: max } })
      }

      if (a) {
        for (let key in a) {
          if (a.hasOwnProperty(key)) {
            if (!_.isArray(a[key])) {
              a[key] = [a[key]]
            }
            where.$and.push([
              { '$attribute.attributeKey$': key },
              { '$attribute.attributeValue$': { $in: a[key] } }
            ])
          }
        }
      }


      let products = await Products.findAll({
        where,
        limit,
        include: {
          model: ProductAttributes,
          as: 'attribute',
          required: false,
          attributes: [],
        },
        offset,
        order: [
          ['id', 'DESC'],
        ],
        group: ['id']
      });


      const attributes = await ProductAttributes.findAll({
        where: { productId: { $in: products.map(p => p.id) } }
      });

      const images = await ProductImages.findAll({
        where: { productId: { $in: products.map(p => p.id) } }
      });

      products = products.map(p => {
        p.images = images.filter(i => i.productId === p.id);
        p.attributes = attributes.filter(a => a.productId === p.id);
        p.setDataValue('attributes', p.attributes);
        p.setDataValue('images', p.images);
        return p
      });

      const productCount = await Products.count({
        where,
        include: {
          model: ProductAttributes,
          as: 'attribute',
          required: false,
          attributes: [],
        },
        group: ['id']
      });

      res.send({
        status: 'ok',
        products,
        productCount: Math.ceil(productCount.length / limit)
      });
    } catch (e) {
      next(e);
    }
  };

  static singleProduct = async (req, res, next) => {
    try {
      await validate(req.body, {
        productId: 'required|numeric',
      });
      const { productId } = req.body;

      if (!productId) {
        throw HttpError(422, 'product does not exist')
      }

      const singleProduct = await Products.getById(productId);
      res.send({
        status: 'ok',
        singleProduct,
      });
    } catch (e) {
      next(e);
    }
  };


  static createProduct = async (req, res, next) => {
    try {
      await validate(req.body, {
        name: 'required|string',
        description: 'required|string',
        shortDescription: 'required|string',
        sku: 'required|string',
        price: 'required|numeric',
        salePrice: 'required|numeric',
        qty: 'required|numeric',
        attributes: 'array',
        'attributes.*.key': 'required|string',
        'attributes.*.value': 'required|string',
        relatedProducts: 'array',
        'relatedProducts.*': 'numeric',
      });

      const {
        name,
        description,
        shortDescription,
        sku,
        price,
        salePrice,
        qty,
        attributes,
        relatedProducts,
      } = req.body;

      let product = await Products.create({
        name,
        description,
        shortDescription,
        sku,
        price,
        salePrice,
        qty,
      });

      const statusDuplicates = attributes.filter(a => a.key === 'положение')
      if (statusDuplicates.length > 1) {
        throw HttpError(422, 'duplicates status attribute')
      }

      if (statusDuplicates) {
        for (let i = 0; i < statusDuplicates.length; i++) {
          if (statusDuplicates[i].value !== 'новый' && statusDuplicates[i].value !== 'акция')
            throw HttpError(422, 'invalid status value, values: (новый, акция)')
        }
      }

      if (+qty < 1 && statusDuplicates) {
        throw HttpError(422, 'Please edit qty. if the status is selected, then there must be at least one product')
      }

      const maxEquipmentAttributes = await ProductAttributes.findAll({ where: { attributeKey: 'секция комплектация' } })

      if (maxEquipmentAttributes.length > 3) {
        throw HttpError(422, 'maximum 3 attributes allowed комплектация')
      }

      if (!_.isEmpty(attributes)) {
        const insertAttributes = attributes.map(a => ({
          productId: product.id,
          attributeKey: a.key,
          attributeValue: a.value,
        }))
        await ProductAttributes.bulkCreate(insertAttributes);
      }

      const relations = await ProductRelations.findAll({
        where: {
          productId: product.id,
        }
      })

      if (!_.isEmpty(relations)) {
        const relIDs = relations.map(r => r.relatedProductId);
        const deletedRelations = _.difference(relIDs, relatedProducts);
        await ProductRelations.destroy({
          where: {
            productId: product.id,
            relatedProductId: { $in: deletedRelations }
          }
        })
      }

      if (!_.isEmpty(relatedProducts)) {
        await Promise.map(relatedProducts, async (relatedProductId) => (
          await ProductRelations.findOrCreate({
            where: {
              productId: product.id,
              relatedProductId,
            },
            defaults: {
              productId: product.id,
              relatedProductId,
            }
          })
        ))
      }

      product = await Products.getById(product.id);

      res.send({
        status: 'ok',
        product,
      });
    } catch (e) {
      next(e);
    }
  };

  static updateProduct = async (req, res, next) => {
    try {
      await validate(req.body, {
        productId: 'required|numeric',
      });

      const { productId } = req.body;

      await validate(req.body, {
        name: 'required|string',
        description: 'required|string',
        shortDescription: 'required|string',
        sku: 'required|string',
        price: 'required|numeric',
        salePrice: 'required|numeric',
        qty: 'required|numeric',
        attributes: 'array',
        'attributes.*.key': 'required|string',
        'attributes.*.value': 'required|string',
        relatedProducts: 'array',
        'relatedProducts.*': 'numeric',
      });

      const {
        name,
        description,
        shortDescription,
        sku,
        price,
        salePrice,
        qty,
        attributes,
        relatedProducts,
      } = req.body;

      let product = await Products.findByPk(productId, {
        include: [{
          model: ProductAttributes,
          required: false,
          as: 'attributes',
        }]
      })

      product.name = name;
      product.description = description;
      product.shortDescription = shortDescription;
      product.sku = sku;
      product.price = price;
      product.salePrice = salePrice;
      product.qty = qty;
      await product.save();

      const statusDuplicates = attributes.filter(a => a.key === 'status')
      if (statusDuplicates.length > 1) {
        throw HttpError(422, 'duplicates status attribute')
      }

      if (statusDuplicates) {
        for (let i = 0; i < statusDuplicates.length; i++) {
          if (statusDuplicates[i].value !== 'new' && statusDuplicates[i].value !== 'sale')
            throw HttpError(422, 'invalid status value, values: (new, sale)')
        }
      }

      if (+qty < 1 && statusDuplicates) {
        throw HttpError(422, 'Please edit qty. if the status is selected, then there must be at least one product')
      }

      const maxEquipmentAttributes = await ProductAttributes.findAll({ where: { attributeKey: 'секция комплектация' } })


      if (maxEquipmentAttributes.length > 3) {
        throw HttpError(422, 'maximum 3 attributes allowed комплектация')
      }

      const deletedAttributes = _.differenceBy(product.attributes, attributes, 'key');
      if (!_.isEmpty(deletedAttributes)) {
        await ProductAttributes.destroy({
          where: {
            productId,
            attributeKey: { $in: deletedAttributes.map((a) => a.attributeKey) }
          }
        })
      }

      await Promise.map(attributes, async (attr) => (
        await ProductAttributes.createOrUpdate({
          where: {
            productId,
            attributeKey: attr.key,
            attributeValue: attr.value,
          },
          defaults: {
            productId,
            attributeKey: attr.key,
            attributeValue: attr.value,
          }
        })
      ))

      const relations = await ProductRelations.findAll({
        where: {
          productId,
        }
      })

      if (!_.isEmpty(relations)) {
        const relIDs = relations.map(r => r.relatedProductId);
        const deletedRelations = _.difference(relIDs, relatedProducts);
        await ProductRelations.destroy({
          where: {
            productId,
            relatedProductId: { $in: deletedRelations }
          }
        })
      }

      if (!_.isEmpty(relatedProducts)) {
        await Promise.map(relatedProducts, async (relatedProductId) => (
          await ProductRelations.findOrCreate({
            where: {
              productId,
              relatedProductId,
            },
            defaults: {
              productId,
              relatedProductId,
            }
          })
        ))
      }

      product = await Products.getById(product.id);

      res.send({
        status: 'ok',
        product,
      });
    } catch (e) {
      next(e);
    }
  };

  static deleteProduct = async (req, res, next) => {
    try {
      await validate(req.body, {
        productsId: 'required|array',
        'productsId.*': 'numeric',
      });

      const { productsId } = req.body;

      if (!productsId || _.isEmpty(productsId)) {
        throw HttpError(422, 'product does not exist')
      }

      await Products.destroy({ where: { id: productsId } })
      await ProductAttributes.destroy({ where: { productsId } })
      await ProductImages.destroy({ where: { productsId } })
      await ProductRelations.destroy({ where: { productsId } })

      productsId.map(productId => {
        const direction = path.join(__dirname, `../public/productImage/${productId}`)
        fs.unlinkSync(direction)
      })

      res.send({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static uploadImage = async (req, res, next) => {
    // const transaction = await db.transaction();
    try {
      await validate(req.body, {
        productId: 'required|numeric',
        images: 'array',
        'images.*': 'numeric',
      });

      const { files } = req;
      const { productId, images = [] } = req.body;

      const product = await Products.findByPk(productId, {
        include: [{
          model: ProductImages,
          required: false,
          as: 'images',
        }]
      })
      if (!product) {
        throw HttpError(422, 'product does not exist')
      }
      const allowTypes = {
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/png': '.png',
      };

      files.forEach(file => {
        const { mimetype } = file;
        if (!allowTypes[mimetype]) {
          throw HttpError(422, 'invalid file type');
        }
      })

      const direction = path.join(__dirname, `../public/productImage/${productId}`);
      if (!fs.existsSync(direction)) {
        fs.mkdirSync(direction, { recursive: true });
      }

      await Promise.map(files, async (file) => {
        const ext = allowTypes[file.mimetype];
        const fileName = `image_${uuid()}${ext}`;
        fs.writeFileSync(path.join(direction, fileName), file.buffer);
        await ProductImages.create({ productId, path: fileName, })
      })
      const deletedImages = _.differenceBy(product.images, images.map(id => ({ id: +id })), 'id');

      if (!_.isEmpty(deletedImages)) {

        await ProductImages.destroy({
          where: {
            id: { $in: deletedImages.map(i => i.id) }
          }
        })
        deletedImages.forEach((image) => {
          fs.unlinkSync(path.join(direction, image.path));
        })
      }
      const updatedImages = await ProductImages.findAll({
        where: { productId }
      });
      // await transaction.commit();
      res.json({
        status: 'ok',
        images: updatedImages,
      });
    } catch (e) {
      // await transaction.rollback();
      next(e);
    }
  };

  static uploadSliderImage = async (req, res, next) => {
    try {
      await validate(req.body, {
        images: 'json',
      });

      const { files } = req;
      let { images = '' } = req.body;

      const allowTypes = {
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/png': '.png',
      };

      files.forEach(file => {
        const { mimetype } = file;
        if (!allowTypes[mimetype]) {
          throw HttpError(422, 'invalid file type');
        }
      })

      const direction = path.join(__dirname, `../public/sliderImages`);

      if (!fs.existsSync(direction)) {
        fs.mkdirSync(direction, { recursive: true });
      }

      await Promise.map(files, async (file) => {
        const ext = allowTypes[file.mimetype];
        const fileName = `image_${uuid()}${ext}`;
        fs.writeFileSync(path.join(direction, fileName), file.buffer);
        await SliderImages.create({ path: fileName })
      })

      images = JSON.parse(images)

      if (!_.isEmpty(images)) {
        images.map(img => {
          fs.unlinkSync(path.join(direction, img.path));
        })

        await SliderImages.destroy({
          where: {
            id: { $in: images.map(img => img.id) }
          }
        })
      }

      const sliderImages = await SliderImages.findAll();

      res.json({
        status: 'ok',
        sliderImages,
      });
    } catch (e) {
      next(e);
    }
  };


  static getSliderImages = async (req, res, next) => {
    try {

      const sliderImages = await SliderImages.findAll();

      res.json({
        status: 'ok',
        sliderImages,
      });
    } catch (e) {

      next(e);
    }
  };

  static getAttributesList = async (req, res, next) => {
    try {
      const attributes = await ProductAttributes.findAll();
      const attributeKey = [];
      const attributeValue = [];
      for (let i = 0; i < attributes.length; i++) {
        attributeKey.push(attributes[i].attributeKey)
        attributeValue.push(attributes[i].attributeValue)
      }

      res.json({
        status: 'ok',
        attributeKey: _.uniq(attributeKey),
        attributeValue: _.uniq(attributeValue),
      });
    } catch (e) {

      next(e);
    }
  };

  static getCatalogList = async (req, res, next) => {
    try {
      let catalog = await ProductAttributes.findAll({ where: { attributeKey: 'каталог' } })

      catalog = _.uniqBy(catalog, 'attributeValue')

      res.json({
        status: 'ok',
        catalog,
      });
    } catch (e) {

      next(e);
    }
  };
}

export default ProductsController;
