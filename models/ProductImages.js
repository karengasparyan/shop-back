import { Model, DataTypes } from 'sequelize';
import db from '../services/db';
import Products from "./Products";
import ProductAttributes from "./ProductAttributes";

class ProductImages extends Model {

}

ProductImages.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  sequelize: db,
  modelName: 'productImages',
  tableName: 'productImages',
});

ProductImages.belongsTo(Products, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  foreignKey: 'productId',
  as: 'product',
});

Products.hasMany(ProductImages, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  foreignKey: 'productId',
  as: 'images',
})

export default ProductImages;
