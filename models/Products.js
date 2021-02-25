import { Model, DataTypes } from 'sequelize';
import db from '../services/db';
import { ProductAttributes, ProductImages, ProductRelations } from "./index";

class Products extends Model {
  static getById(productId) {
    return Products.findByPk(productId, {
      include: [{
        model: ProductAttributes,
        required: false,
        as: 'attributes',
      }, {
        model: ProductImages,
        required: false,
        as: 'images',
      }, {
        model: Products,
        required: false,
        as: 'relatedProducts',
        through: ProductRelations,
        include: [{
          model: ProductImages,
          required: false,
          as: 'images',
        }, {
          model: ProductAttributes,
          required: false,
          as: 'attributes',
        }]
      }],
    })
  }
}

Products.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  shortDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  salePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  qty: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
}, {
  sequelize: db,
  modelName: 'products',
  tableName: 'products',
});

export default Products;
